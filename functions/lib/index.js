"use strict";
// File: functions/src/index.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.processBatchGenerationJob = exports.checkScheduledPosts = void 0;
// Sử dụng các import của Firebase Functions v2 hiện đại.
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const genai_1 = require("@google/genai");
// Import `defineString` để quản lý API key một cách an toàn.
const params_1 = require("firebase-functions/params");
// Khởi tạo Firebase Admin SDK.
admin.initializeApp();
const db = admin.firestore();
// ============================================================================
// CONFIGURATION
// ============================================================================
// Định nghĩa GEMINI_API_KEY như một secret parameter.
// Đây là cách làm được khuyến nghị và an toàn nhất.
// Bạn phải cài đặt giá trị này trước khi deploy.
const geminiApiKey = (0, params_1.defineString)("GEMINI_API_KEY");
// ============================================================================
// CLOUD FUNCTION 1: SCHEDULED POST CHECKER (v2)
// ============================================================================
/**
 * Cloud Function này chạy theo lịch trình để kiểm tra và đăng các bài viết đã đến hạn.
 * Kích hoạt mỗi 5 phút.
 */
exports.checkScheduledPosts = (0, scheduler_1.onSchedule)("every 5 minutes", async (event) => {
    const now = admin.firestore.Timestamp.now();
    logger.info(`Running scheduled post check at: ${event.scheduleTime}`);
    const query = db.collection("schedules").where("scheduledTime", "<=", now);
    const snapshot = await query.get();
    if (snapshot.empty) {
        logger.info("No scheduled articles are due for posting.");
    }
    logger.info(`Found ${snapshot.size} articles to post.`);
    const postPromises = snapshot.docs.map(async (doc) => {
        const scheduledArticle = doc.data();
        const docId = doc.id;
        try {
            if (!scheduledArticle.userId) {
                throw new Error(`Scheduled article ${docId} is missing a userId.`);
            }
            const userDoc = await db.collection("users").doc(scheduledArticle.userId).get();
            if (!userDoc.exists) {
                throw new Error(`User document not found for userId: ${scheduledArticle.userId}`);
            }
            const userData = userDoc.data();
            const { webhookUrl } = userData;
            if (!webhookUrl) {
                logger.warn(`No webhook URL for user ${scheduledArticle.userId}. Deleting schedule ${docId}.`);
                await doc.ref.delete();
                return;
            }
            // Giả sử Node.js 18+ runtime có fetch toàn cục.
            const response = await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: scheduledArticle.title,
                    content: scheduledArticle.content,
                    imageUrl: scheduledArticle.imageUrl,
                }),
            });
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Webhook call failed with status ${response.status}: ${errorBody}`);
            }
            logger.info(`Successfully posted article ${docId}. Deleting from schedule.`);
            await doc.ref.delete();
        }
        catch (error) {
            logger.error(`Error processing scheduled article ${docId}:`, error);
            await doc.ref.delete(); // Xóa để tránh lặp lại lỗi
        }
    });
    await Promise.all(postPromises);
    logger.info("Finished processing scheduled posts batch.");
});
// ============================================================================
// CLOUD FUNCTION 2: BATCH CONTENT GENERATOR (v2)
// ============================================================================
/**
 * Cloud Function này được kích hoạt khi một tài liệu mới được tạo trong
 * collection 'generation_jobs'. Nó tạo ra các bài viết và hình ảnh dựa trên
 * chi tiết công việc và cập nhật tiến trình trong Firestore.
 */
exports.processBatchGenerationJob = (0, firestore_1.onDocumentCreated)({
    document: "generation_jobs/{jobId}",
    // Tăng thời gian chờ và bộ nhớ để xử lý các tác vụ lớn
    timeoutSeconds: 540,
    memory: "1GiB",
    region: "us-central1", // Chỉ định region để ổn định
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        logger.log("No data associated with the event");
        return;
    }
    const jobData = snapshot.data();
    const jobId = event.params.jobId;
    const jobRef = db.collection("generation_jobs").doc(jobId);
    try {
        logger.info(`[Job ${jobId}] Starting job for user ${jobData.userId}`);
        await jobRef.update({ status: "processing" });
        // Khởi tạo Gemini client bằng API key đã được lấy một cách an toàn.
        const ai = new genai_1.GoogleGenAI({ apiKey: geminiApiKey.value() });
        const articleSchema = {
            type: genai_1.Type.OBJECT,
            properties: {
                title: { type: genai_1.Type.STRING, description: "A catchy and engaging title for the social media post." },
                content: { type: genai_1.Type.STRING, description: "The main body of the post, formatted for readability." },
                imagePrompt: { type: genai_1.Type.STRING, description: "A detailed, creative prompt for an AI image generator." },
            },
            required: ["title", "content", "imagePrompt"],
        };
        for (let i = 1; i <= jobData.count; i++) {
            // Kiểm tra xem công việc có bị hủy không trước khi xử lý mỗi bài viết.
            const currentJobSnapshot = await jobRef.get();
            const currentJobData = currentJobSnapshot.data();
            if (!currentJobSnapshot.exists || currentJobData?.status === "cancelled") {
                logger.info(`Job ${jobId} was cancelled. Halting execution.`);
                if (currentJobData?.status !== "cancelled") {
                    await jobRef.update({ status: "cancelled", error: "Job cancelled by user." });
                }
                return;
            }
            logger.info(`[Job ${jobId}] Generating article ${i}/${jobData.count}`);
            // 1. Tạo nội dung bài viết
            logger.info(`[Job ${jobId}] Calling Gemini Pro for text generation...`);
            const textResponse = await ai.models.generateContent({
                model: "gemini-2.5-pro",
                contents: `Generate one social media post about the following topic: "${jobData.topic}". The post must be written in ${jobData.language}.`,
                config: {
                    systemInstruction: jobData.systemPrompt,
                    responseMimeType: "application/json",
                    responseSchema: articleSchema,
                },
            });
            const articleText = JSON.parse(textResponse.text.trim());
            logger.info(`[Job ${jobId}] Text generation successful.`);
            // 2. Tạo hình ảnh
            logger.info(`[Job ${jobId}] Calling Imagen for image generation...`);
            const imageResponse = await ai.models.generateImages({
                model: "imagen-4.0-generate-001",
                prompt: articleText.imagePrompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: "image/jpeg",
                    aspectRatio: "1:1",
                },
            });
            const base64ImageBytes = imageResponse.generatedImages?.[0]?.image?.imageBytes;
            if (!base64ImageBytes) {
                throw new Error("No image generated");
            }
            const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
            logger.info(`[Job ${jobId}] Image generation successful.`);
            // 3. Save to 'generated_articles' collection for user preview
            logger.info(`[Job ${jobId}] Saving generated article to Firestore generated_articles.`);
            await db.collection("generated_articles").add({
                userId: jobData.userId,
                jobId: jobId,
                title: articleText.title,
                content: articleText.content,
                imagePrompt: articleText.imagePrompt,
                topic: jobData.topic,
                imageUrl: imageUrl,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            // 4. Cập nhật tiến trình (progress)
            await jobRef.update({ progress: i });
        }
        logger.info(`[Job ${jobId}] Job completed successfully.`);
        await jobRef.update({ status: "completed" });
    }
    catch (error) {
        logger.error(`[Job ${jobId}] Job failed:`, error);
        await jobRef.update({
            status: "failed",
            error: error.message || "An unknown error occurred.",
        });
    }
});
//# sourceMappingURL=index.js.map
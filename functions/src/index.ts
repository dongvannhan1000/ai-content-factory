// File: functions/src/index.ts

// Sử dụng các import của Firebase Functions v2 hiện đại.
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { GoogleGenAI, Type } from "@google/genai";
// Import `defineString` để quản lý API key một cách an toàn.
import { defineString } from "firebase-functions/params";

// Khởi tạo Firebase Admin SDK.
admin.initializeApp();

const db = admin.firestore();

// ============================================================================
// CONFIGURATION
// ============================================================================

// Định nghĩa GEMINI_API_KEY như một secret parameter.
// Đây là cách làm được khuyến nghị và an toàn nhất.
// Bạn phải cài đặt giá trị này trước khi deploy.
const geminiApiKey = defineString("GEMINI_API_KEY");


// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ScheduledArticle {
    userId: string;
    title: string;
    content: string;
    imageUrl: string;
    scheduledTime: admin.firestore.Timestamp;
}

export interface UserSettings {
  settings: {
    ai: {
    systemPrompt: string;
    contentLanguage: string;
  };
  vision: {
    visionSystemPrompt: string;
    imagePromptSuffix: string;
    imageAspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  };
  integration: {
    webhookUrl: string;
    };
  }
}

interface GenerationJob {
    userId: string;
    topic: string;
    count: number;
    language: string;
    systemPrompt: string;
    imagePromptSuffix?: string;
    status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
}


// ============================================================================
// CALLABLE FUNCTIONS FOR FRONTEND
// ============================================================================

/**
 * Generate articles from a topic (single or multiple)
 */
export const generateArticlesFromTopic = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { topic, count, language, systemPrompt, imagePromptSuffix } = request.data;
  
  if (!topic || !count || !language) {
    throw new HttpsError('invalid-argument', 'Missing required parameters');
  }

  const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });
  
  const articleSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'A catchy and engaging title for the social media post.' },
      content: { type: Type.STRING, description: 'The main body of the post, formatted for readability on social platforms.' },
      imagePrompt: { type: Type.STRING, description: `A detailed, creative prompt for an AI image generator to create a visually appealing image that matches the post.` },
    },
    required: ['title', 'content', 'imagePrompt'],
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `Generate ${count} social media posts about the following topic: "${topic}". The posts must be written in ${language}.`,
      config: {
        systemInstruction: systemPrompt || 'You are an expert social media manager specializing in viral content.',
        responseMimeType: "application/json",
        responseSchema: articleSchema
      },
    });

    const jsonText = response.text?.trim();
    if (!jsonText) {
      throw new HttpsError('internal', 'Received empty response from AI');
    }
    const articles = JSON.parse(jsonText!);

    if (Array.isArray(articles) || typeof articles !== 'object' || articles === null) {
       throw new HttpsError('internal', 'AI returned unexpected data structure');
    }
    if (imagePromptSuffix && articles.imagePrompt) {
      articles.imagePrompt = `${articles.imagePrompt.trim()}, ${imagePromptSuffix}`;
    }
    return { articles };
  } catch (error: any) {
    logger.error('Error generating articles from topic:', error);
    throw new HttpsError('internal', error.message || 'Failed to generate articles');
  }
});

/**
 * Generate articles from multiple images (one article per image)
 */
export const generateArticlesFromImages = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { imageUrls, systemPrompt, language } = request.data;
  
  if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
    throw new HttpsError('invalid-argument', 'Missing or invalid image URLs');
  }

  const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });
  
  const articleSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      content: { type: Type.STRING },
      imagePrompt: { type: Type.STRING },
    },
    required: ['title', 'content', 'imagePrompt'],
  };

  try {
    const articles = [];
    
    for (const imageUrl of imageUrls) {
      // Fetch image from URL
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image from URL: ${imageUrl}`);
      }
      
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');
      const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
      
      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType,
        },
      };
      const textPart = { text: `Describe this image and write a social media post about it in ${language}. Provide a title, content, and a new image prompt to recreate a similar, high-quality image.` };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
          systemInstruction: `${systemPrompt}. Write in ${language}.` || 'You are an expert social media manager specializing in viral content.',
          responseMimeType: "application/json",
          responseSchema: articleSchema,
        }
      });

      const jsonText = response.text?.trim();
      articles.push(JSON.parse(jsonText!));
    }

    return { articles };
  } catch (error: any) {
    logger.error('Error generating articles from images:', error);
    throw new HttpsError('internal', error.message || 'Failed to generate articles from images');
  }
});

/**
 * Generate article from a website URL
 */
export const generateArticleFromWebsite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { websiteUrl, systemPrompt } = request.data;
  
  if (!websiteUrl) {
    throw new HttpsError('invalid-argument', 'Missing website URL');
  }

  const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });
  
  const articleSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      content: { type: Type.STRING },
      imagePrompt: { type: Type.STRING },
    },
    required: ['title', 'content', 'imagePrompt'],
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `Analyze the content of the website at this URL: ${websiteUrl}. Based on its content, create an engaging social media post. Create a new title, content, and a creative image prompt.`,
      config: {
        systemInstruction: systemPrompt || 'You are an expert social media manager specializing in viral content.',
        responseMimeType: "application/json",
        responseSchema: articleSchema,
      }
    });

    const jsonText = response.text?.trim();
    return { article: JSON.parse(jsonText!) };
  } catch (error: any) {
    logger.error('Error generating article from website:', error);
    throw new HttpsError('internal', error.message || 'Failed to generate article from website');
  }
});

/**
 * Regenerate article text (title and content)
 */
export const regenerateArticleText = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { article, systemPrompt } = request.data;
  
  if (!article) {
    throw new HttpsError('invalid-argument', 'Missing article data');
  }

  const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });

  try {
    const prompt = `Regenerate the title and content for the following social media post.
    Original Title: ${article.title}
    Original Content: ${article.content}
    Topic (optional): ${article.topic || 'not specified'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        systemInstruction: systemPrompt || 'You are an expert social media manager specializing in viral content.',
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
          },
          required: ['title', 'content'],
        },
      },
    });
    
    const jsonText = response.text?.trim();
    return { text: JSON.parse(jsonText!) };
  } catch (error: any) {
    logger.error('Error regenerating article text:', error);
    throw new HttpsError('internal', error.message || 'Failed to regenerate article text');
  }
});

/**
 * Generate image from a prompt
 */
export const generateImage = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { prompt } = request.data;
  
  if (!prompt) {
    throw new HttpsError('invalid-argument', 'Missing image prompt');
  }

  const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });

  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-fast-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      },
    });

    const base64ImageBytes: string = response.generatedImages![0].image!.imageBytes!;
    return { imageUrl: `data:image/jpeg;base64,${base64ImageBytes}` };
  } catch (error: any) {
    logger.error('Error generating image:', error);
    throw new HttpsError('internal', error.message || 'Failed to generate image');
  }
});

/**
 * Regenerate image prompt for an article
 */
export const regenerateImagePrompt = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { article, systemPrompt, imagePromptSuffix } = request.data;
  
  if (!article) {
    throw new HttpsError('invalid-argument', 'Missing article data');
  }

  const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });

  try {
    const prompt = `Regenerate the image prompt for the following social media post.
    Title: ${article.title}
    Content: ${article.content}
    Original Image Prompt: ${article.imagePrompt || 'not specified'}
    Topic (optional): ${article.topic || 'not specified'}
    Image Prompt Suffix: ${imagePromptSuffix}
    
    Create a descriptive and detailed image prompt that captures the essence of this post.
    Add the suffix to the end of the image prompt.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        systemInstruction: systemPrompt || 'You are an expert social media manager specializing in viral content.',
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            imagePrompt: { type: Type.STRING },
          },
          required: ['imagePrompt'],
        },
      },
    });
    
    const jsonText = response.text?.trim();
    const result = JSON.parse(jsonText!);

    return { imagePrompt: result.imagePrompt };
  } catch (error: any) {
    logger.error('Error regenerating image prompt:', error);
    throw new HttpsError('internal', error.message || 'Failed to regenerate image prompt');
  }
});

// ============================================================================
// CLOUD FUNCTION 1: SCHEDULED POST CHECKER (v2)
// ============================================================================

/**
 * Cloud Function này chạy theo lịch trình để kiểm tra và đăng các bài viết đã đến hạn.
 * Kích hoạt mỗi 5 phút.
 */
export const checkScheduledPosts = onSchedule(
  "every 5 minutes",
  async (event) => {
    const now = admin.firestore.Timestamp.now();
    logger.info(`Running scheduled post check at: ${event.scheduleTime}`);

    const query = db.collection("schedules").where("scheduledTime", "<=", now);
    const snapshot = await query.get();

    if (snapshot.empty) {
      logger.info("No scheduled articles are due for posting.");
    }

    logger.info(`Found ${snapshot.size} articles to post.`);

    const postPromises = snapshot.docs.map(async (doc) => {
      const scheduledArticle = doc.data() as ScheduledArticle;
      const docId = doc.id;

      try {
        if (!scheduledArticle.userId) {
          throw new Error(`Scheduled article ${docId} is missing a userId.`);
        }

        const userDoc = await db.collection("users").doc(scheduledArticle.userId).get();
        if (!userDoc.exists) {
          throw new Error(`User document not found for userId: ${scheduledArticle.userId}`);
        }

        const userData = userDoc.data() as UserSettings;
        logger.info("userData", userData);
        const { webhookUrl } = userData.settings.integration;
        logger.info("webhookUrl", webhookUrl);

        if (!webhookUrl) {
          logger.warn(
            `No webhook URL for user ${scheduledArticle.userId}. Deleting schedule ${docId}.`
          );
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
      } catch (error) {
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
export const processBatchGenerationJob = onDocumentCreated({
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
    const jobData = snapshot.data() as GenerationJob;
    const jobId = event.params.jobId;
    const jobRef = db.collection("generation_jobs").doc(jobId);
  
    try {
      logger.info(`[Job ${jobId}] Starting job for user ${jobData.userId}`);
      await jobRef.update({ status: "processing" });
  
      // Khởi tạo Gemini client bằng API key đã được lấy một cách an toàn.
      const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });
  
      const articleSchema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "A catchy and engaging title for the social media post." },
          content: { type: Type.STRING, description: "The main body of the post, formatted for readability." },
          imagePrompt: { type: Type.STRING, description: "A detailed, creative prompt for an AI image generator." },
        },
        required: ["title", "content", "imagePrompt"],
      };
  
      for (let i = 1; i <= jobData.count; i++) {
        // Kiểm tra xem công việc có bị hủy không trước khi xử lý mỗi bài viết.
        const currentJobSnapshot = await jobRef.get();
        const currentJobData = currentJobSnapshot.data() as GenerationJob;

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
        const articleText = JSON.parse(textResponse.text!.trim());
        logger.info(`[Job ${jobId}] Text generation successful.`);

        // Apply imagePromptSuffix if provided
        if (jobData.imagePromptSuffix && articleText.imagePrompt) {
          articleText.imagePrompt = `${articleText.imagePrompt.trim()}, ${jobData.imagePromptSuffix}`;
        }

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
    } catch (error: any) {
      logger.error(`[Job ${jobId}] Job failed:`, error);
      await jobRef.update({ 
          status: "failed",
          error: error.message || "An unknown error occurred.",
      });
    }
});
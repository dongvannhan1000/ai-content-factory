import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../firebase';
import { doc, collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { Article, GenerationMode, GenerationJob, User, UserSettings } from '../../../types';
import {
    generateArticlesFromImages,
    generateArticleFromWebsite,
    generateArticlesFromTopic,
    generateImage,
} from '../../../services/geminiService';

export const useGenerator = (user: User | null, settings: UserSettings) => {
    const [articles, setArticles] = useState<Article[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingTotal, setLoadingTotal] = useState(0);
    const [generationJobs, setGenerationJobs] = useState<GenerationJob[]>([]);
    const [isBatchJobRunning, setIsBatchJobRunning] = useState(false);
    const [completedJobId, setCompletedJobId] = useState<string | null>(null);
    const [currentBatchJobId, setCurrentBatchJobId] = useState<string | null>(null);
    const isBatchJobRunningRef = useRef(false);
    const [mode, setMode] = useState<GenerationMode>('topic');

    useEffect(() => {
        if (!user) {
            setGenerationJobs([]);
            setIsBatchJobRunning(false);
            return;
        }

        const jobsCollection = collection(db, 'generation_jobs');
        const q = query(
            jobsCollection,
            where('userId', '==', user.uid),
            where('status', 'in', ['pending', 'processing'])
        );

        const unsubscribe = onSnapshot(q, snapshot => {
            const jobs: GenerationJob[] = [];
            snapshot.forEach(doc => {
                jobs.push({ docId: doc.id, ...doc.data() } as GenerationJob);
            });

            // Check if a batch job just completed
            if (isBatchJobRunningRef.current && jobs.length === 0 && currentBatchJobId) {
                console.log('[Job Listener] Job completed, setting completedJobId:', currentBatchJobId);
                setCompletedJobId(currentBatchJobId);
                setCurrentBatchJobId(null); // Clear current job ID
            }

            setGenerationJobs(jobs);
            const isRunning = jobs.length > 0;
            setIsBatchJobRunning(isRunning);
            isBatchJobRunningRef.current = isRunning;
        });

        return () => unsubscribe();
    }, [user, currentBatchJobId]);

    // Listen for generated articles from completed batch job
    useEffect(() => {
        if (!user || !completedJobId) {
            return;
        }

        console.log('[Articles Listener] Starting listener for jobId:', completedJobId);

        const articlesCollection = collection(db, 'generated_articles');
        const q = query(
            articlesCollection,
            where('userId', '==', user.uid),
            where('jobId', '==', completedJobId)
        );

        const unsubscribe = onSnapshot(q, snapshot => {
            console.log('[Articles Listener] Snapshot received, size:', snapshot.size);
            const batchArticles: Article[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log('[Articles Listener] Article doc:', doc.id, data);
                batchArticles.push({
                    id: doc.id, // Use Firestore doc ID as article ID
                    title: data.title,
                    content: data.content,
                    imageUrl: data.imageUrl,
                    imagePrompt: data.imagePrompt,
                    topic: data.topic,
                });
            });

            console.log('[Articles Listener] Setting articles, count:', batchArticles.length);
            setArticles(batchArticles);
            // Always set isLoading to false when we get results, even if empty
            setIsLoading(false);
        }, (error) => {
            console.error('[Articles Listener] Error:', error);
            setIsLoading(false);
        });

        return () => {
            console.log('[Articles Listener] Cleaning up listener for jobId:', completedJobId);
            unsubscribe();
        };
    }, [user, completedJobId]);

    const handleGenerate = async (mode: GenerationMode, data: any, count: number) => {
        setIsLoading(true);
        setLoadingProgress(0);
        setArticles([]);
        setCompletedJobId(null);
        setCurrentBatchJobId(null);

        // Logic for batch generation via Cloud Function
        if (mode === 'topic' && count >= 1) {
            if (!user) {
                alert("You must be logged in to start a batch job.");
                setIsLoading(false);
                return;
            }
            try {
                const jobsCollection = collection(db, 'generation_jobs');
                const jobDoc = await addDoc(jobsCollection, {
                    userId: user.uid,
                    topic: data.topic,
                    count: count,
                    language: data.language,
                    systemPrompt: settings.ai.systemPrompt,
                    imagePromptSuffix: settings.vision.imagePromptSuffix,
                    status: 'pending',
                    progress: 0,
                    createdAt: serverTimestamp(),
                });
                setCurrentBatchJobId(jobDoc.id);
                // No alert needed, the progress view will appear automatically.
            } catch (error) {
                console.error("Could not submit the generation job:", error);
                alert("Could not submit the generation job. Please check the console and try again.");
                setIsLoading(false);
            }
            return;
        }

        // Logic for single/interactive generation
        try {
            if (mode === 'topic') {
                setLoadingTotal(count);
                console.log(count);
                const generatedTexts = await generateArticlesFromTopic(data.topic, count, data.language, settings.ai.systemPrompt, settings.vision.imagePromptSuffix);
                const newArticles: Article[] = [];
                for (const text of generatedTexts) {
                    const imageUrl = await generateImage(text.imagePrompt);
                    newArticles.push({
                        id: uuidv4(),
                        ...text,
                        imageUrl,
                        topic: data.topic,
                    });
                    setLoadingProgress(prev => prev + 1);
                }
                setArticles(newArticles);
            } else if (mode === 'image') {
                setLoadingTotal(data.images.length);

                // First, convert uploaded images to data URLs for display
                const uploadedImageUrls = await Promise.all(
                    data.images.map((image: File) =>
                        new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.readAsDataURL(image);
                        })
                    )
                );

                // Generate articles from images (this uploads to Storage and calls Cloud Function)
                const generatedTexts = await generateArticlesFromImages(data.images, settings.ai.contentLanguage, settings.ai.systemPrompt);
                const newArticles: Article[] = [];

                for (let i = 0; i < generatedTexts.length; i++) {
                    const text = generatedTexts[i];

                    newArticles.push({
                        id: uuidv4(),
                        ...text,
                        imageUrl: uploadedImageUrls[i], // Use the uploaded image data URL for display
                    });
                    setLoadingProgress(prev => prev + 1);
                }
                setArticles(newArticles);
            } else { // website
                setLoadingTotal(1);
                const generatedText = await generateArticleFromWebsite(data.websiteUrl, settings.ai.contentLanguage, settings.ai.systemPrompt);
                const imageUrl = await generateImage(generatedText.imagePrompt);
                setArticles([{
                    id: uuidv4(),
                    ...generatedText,
                    imageUrl,
                }]);
                setLoadingProgress(1);
            }
        } catch (error: any) {
            console.error("Content generation failed:", error);
            let errorMessage = "An error occurred during content generation. Please check the console for details.";
            // FIX: Add specific error handling for invalid API key (404 Not Found).
            if (typeof error.message === 'string' && error.message.includes("Requested entity was not found")) {
                errorMessage = "Content generation failed (Error 404: Not Found).\n\nThis usually means the API key is invalid, has been deleted, or is not configured for this project.\n\nPlease verify your API key and project settings in the Google Cloud Console.";
            }
            alert(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        setArticles(articles.filter(a => a.id !== id));
        // Also delete from generated_articles collection if it exists there
        if (user && completedJobId) {
            try {
                const articleDoc = doc(db, 'generated_articles', id);
                await deleteDoc(articleDoc);
            } catch (error) {
                console.error("Error deleting generated article:", error);
            }
        }
    };

    const handleCancelJob = async (jobId: string) => {
        if (!user) return;
        try {
            const jobDoc = doc(db, 'generation_jobs', jobId);
            await updateDoc(jobDoc, {
                status: 'cancelled',
            });
        } catch (error) {
            console.error("Failed to cancel job:", error);
            alert("Could not cancel the job. Please try again.");
        }
    };

    const handlePostNow = async (article: Article) => {
        if (!settings.integration.webhookUrl) {
            alert("Please set a Webhook URL in the settings first.");
            throw new Error("Webhook URL is not set.");
        }
        try {
            const response = await fetch(settings.integration.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: article.title,
                    content: article.content,
                    imageUrl: article.imageUrl,
                }),
            });
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Webhook failed with status ${response.status}: ${errorBody}`);
            }
            alert("Article posted successfully!");
            handleDelete(article.id);
        } catch (error) {
            console.error("Failed to post article:", error);
            alert(`Failed to post article. See console for details.`);
            throw error;
        }
    };

    return {
        articles,
        setArticles,
        isLoading,
        loadingProgress,
        loadingTotal,
        generationJobs,
        isBatchJobRunning,
        mode,
        setMode,
        handleGenerate,
        handleDelete,
        handleCancelJob,
        handlePostNow,
        completedJobId
    };
};

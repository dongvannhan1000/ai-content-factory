import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';
import { Article, GeneratedArticleText, GeneratedArticleTextFromImage } from '../types';

const functions = getFunctions(app);

/**
 * Generates a list of articles based on a topic.
 */
export const generateArticlesFromTopic = async (topic: string, count: number, language: string, systemInstruction: string): Promise<GeneratedArticleTextFromImage[]> => {
  const generateFn = httpsCallable(functions, 'generateArticlesFromTopic');
  const result = await generateFn({ topic, count, language, systemPrompt: systemInstruction });
  return (result.data as any).articles;
};

/**
 * Generates a single article from a provided image.
 */
export const generateArticleFromImage = async (image: File, systemInstruction: string): Promise<GeneratedArticleTextFromImage> => {
  const imageData = await fileToBase64(image);
  const generateFn = httpsCallable(functions, 'generateArticleFromImage');
  const result = await generateFn({ 
    imageData, 
    mimeType: image.type,
    systemPrompt: systemInstruction 
  });
  return (result.data as any).article;
};

/**
 * Generates a single article by analyzing a website URL.
 */
export const generateArticleFromWebsite = async (websiteUrl: string, systemInstruction: string): Promise<GeneratedArticleTextFromImage> => {
  const generateFn = httpsCallable(functions, 'generateArticleFromWebsite');
  const result = await generateFn({ websiteUrl, systemPrompt: systemInstruction });
  return (result.data as any).article;
};

/**
 * Regenerates the title and content for an existing article.
 */
export const regenerateArticleText = async (article: Article, systemInstruction: string): Promise<GeneratedArticleText> => {
  const regenerateFn = httpsCallable(functions, 'regenerateArticleText');
  const result = await regenerateFn({ article, systemPrompt: systemInstruction });
  return (result.data as any).text;
};

/**
 * Generates an image from a text prompt.
 */
export const generateImage = async (prompt: string): Promise<string> => {
  const generateFn = httpsCallable(functions, 'generateImage');
  const result = await generateFn({ prompt });
  return (result.data as any).imageUrl;
};

export const regenerateImagePrompt = async (article: Article, systemInstruction: string): Promise<string> => {
  const regenerateFn = httpsCallable(functions, 'regenerateImagePrompt');
  const result = await regenerateFn({ article, systemPrompt: systemInstruction });
  return (result.data as any).imagePrompt;
};

// Helper function to convert a File object to a base64 string
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};
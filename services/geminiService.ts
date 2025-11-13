import { getFunctions, httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app, storage } from '../firebase';
import { auth } from '../firebase';
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
 * Generates articles from provided images (one article per image).
 */
export const generateArticlesFromImages = async (images: File[], systemInstruction: string): Promise<GeneratedArticleTextFromImage[]> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to upload images');
  }

  // Upload images to Firebase Storage and get URLs
  const imageUrls = await Promise.all(
    images.map(async (image, index) => {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${index}_${image.name}`;
      const storageRef = ref(storage, `user-images/${user.uid}/${fileName}`);
      
      await uploadBytes(storageRef, image);
      const url = await getDownloadURL(storageRef);
      return url;
    })
  );
  
  const generateFn = httpsCallable(functions, 'generateArticlesFromImages');
  const result = await generateFn({ 
    imageUrls,
    systemPrompt: systemInstruction 
  });
  return (result.data as any).articles;
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


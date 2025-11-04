import { GoogleGenAI, Type } from "@google/genai";
import { Article, GeneratedArticleText, GeneratedArticleTextFromImage } from '../types';

// Per guidelines, API key is from process.env.API_KEY.
// The exclamation mark asserts that the value is non-null.
const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});

const articleSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'A catchy and engaging title for the social media post.' },
    content: { type: Type.STRING, description: 'The main body of the post, formatted for readability on social platforms.' },
    imagePrompt: { type: Type.STRING, description: 'A detailed, creative prompt for an AI image generator to create a visually appealing image that matches the post.' },
  },
  required: ['title', 'content', 'imagePrompt'],
};

/**
 * Generates a list of articles based on a topic.
 */
export const generateArticlesFromTopic = async (topic: string, count: number, language: string, systemInstruction: string): Promise<GeneratedArticleTextFromImage[]> => {
  // Use gemini-2.5-pro for complex text tasks like generating multiple structured articles.
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: `Generate ${count} social media posts about the following topic: "${topic}". The posts must be written in ${language}.`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: articleSchema,
      },
    },
  });

  // Extract text and parse JSON as per guidelines.
  const jsonText = response.text.trim();
  const articles = JSON.parse(jsonText);
  return articles;
};

/**
 * Generates a single article from a provided image.
 */
export const generateArticleFromImage = async (image: File, systemInstruction: string): Promise<GeneratedArticleTextFromImage> => {
    const imagePart = {
        inlineData: {
          data: await fileToBase64(image),
          mimeType: image.type,
        },
    };
    const textPart = { text: 'Describe this image and write a social media post about it. Provide a title, content, and a new image prompt to recreate a similar, high-quality image.' };

    // Use gemini-2.5-flash for general multimodal tasks.
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: articleSchema,
        }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
};

/**
 * Generates a single article by analyzing a website URL.
 */
export const generateArticleFromWebsite = async (websiteUrl: string, systemInstruction: string): Promise<GeneratedArticleTextFromImage> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: `Analyze the content of the website at this URL: ${websiteUrl}. Based on its content, create an engaging social media post. Create a new title, content, and a creative image prompt.`,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: articleSchema,
        }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
};

/**
 * Regenerates the title and content for an existing article.
 */
export const regenerateArticleText = async (article: Article, systemInstruction: string): Promise<GeneratedArticleText> => {
    const prompt = `Regenerate the title and content for the following social media post.
    Original Title: ${article.title}
    Original Content: ${article.content}
    Topic (optional): ${article.topic || 'not specified'}`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    content: { type: Type.STRING },
                },
                required: ['title', 'content'],
            },
        }
    });
    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
};

/**
 * Generates an image from a text prompt.
 */
export const generateImage = async (prompt: string): Promise<string> => {
  // Switched to imagen-4.0-generate-001 for higher quality and consistency with batch jobs.
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: prompt,
    config: {
      numberOfImages: 1,
      // Using jpeg for smaller file sizes.
      outputMimeType: 'image/jpeg',
      aspectRatio: '1:1',
    },
  });

  const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
  return `data:image/jpeg;base64,${base64ImageBytes}`;
};

export const regenerateImagePrompt = async (article: Article, systemInstruction: string): Promise<string> => {
    const prompt = `Regenerate the image prompt for the following social media post.
    Title: ${article.title}
    Content: ${article.content}
    Original Image Prompt: ${article.imagePrompt || 'not specified'}
    Topic (optional): ${article.topic || 'not specified'}
    
    Create a descriptive and detailed image prompt that captures the essence of this post.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    imagePrompt: { type: Type.STRING },
                },
                required: ['imagePrompt'],
            },
        }
    });
    
    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    return result.imagePrompt;
};


// Helper function to convert a File object to a base64 string
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // result is "data:image/jpeg;base64,...." -> we only want the part after the comma
            const result = reader.result as string;
            resolve(result.split(',')[1]);
        };
        reader.onerror = (error) => reject(error);
    });
};
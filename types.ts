export interface User {
  uid: string;
  email: string | null;
  name?: string;
  phone?: string;
  systemPrompt?: string;
  webhookUrl?: string;
}

export interface Article {
  id: string; // client-side ID
  title: string;
  content: string;
  imageUrl: string;
  imagePrompt?: string; // only for auto-generated images
  topic?: string; // To remember the topic for regeneration
}

export interface ScheduledArticle extends Article {
  docId: string; // Firestore document ID
  userId: string;
  scheduledTime: number; // as timestamp
}

export interface GeneratedArticleText {
    title: string;
    content: string;
}

export interface GeneratedArticleTextFromImage extends GeneratedArticleText {
    imagePrompt: string;
}

export type GenerationMode = 'topic' | 'image' | 'website';

export interface GenerationJob {
  docId: string;
  userId: string;
  topic: string;
  count: number;
  language: string;
  systemPrompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: any; // Firestore Timestamp
  progress?: number;
  error?: string;
}
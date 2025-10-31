
import React, { useState } from 'react';
import { Article, GeneratedArticleText, GeneratedArticleTextFromImage } from '../types';

interface ArticleCardProps {
  article: Article;
  onRegenerateText: (article: Article) => Promise<GeneratedArticleText | GeneratedArticleTextFromImage>;
  onRegenerateImage: (article: Article) => Promise<string>;
  onSchedule: (article: Article) => void;
  onDelete: (id: string) => void;
  onPostNow: (article: Article) => Promise<void>;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ article, onRegenerateText, onRegenerateImage, onSchedule, onDelete, onPostNow }) => {
  const [isRegeneratingText, setIsRegeneratingText] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [currentArticle, setCurrentArticle] = useState(article);

  const handleApiError = (error: any): string => {
      console.error("API call failed:", error);
      if (typeof error.message === 'string' && error.message.includes("Requested entity was not found")) {
          return "Action failed (Error 404: Not Found).\n\nThis usually means the API key is invalid or deleted.\n\nPlease verify your API key in the Google Cloud Console.";
      }
      return "An unexpected error occurred. Please try again.";
  };

  const handleRegenerateText = async () => {
    setIsRegeneratingText(true);
    try {
      const newText = await onRegenerateText(currentArticle);
      setCurrentArticle(prev => ({ ...prev, ...newText }));
    } catch (error) {
      const errorMessage = handleApiError(error);
      alert(errorMessage);
    } finally {
      setIsRegeneratingText(false);
    }
  };

  const handleRegenerateImage = async () => {
    if (!currentArticle.imagePrompt) {
      alert("Cannot regenerate image without an image prompt. This is only available for auto-generated articles.");
      return;
    }
    setIsRegeneratingImage(true);
    try {
      const newImageUrl = await onRegenerateImage(currentArticle);
      setCurrentArticle(prev => ({ ...prev, imageUrl: newImageUrl }));
    } catch (error) {
        const errorMessage = handleApiError(error);
        alert(errorMessage);
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  const handlePostNowClick = () => {
    setIsPosting(true);
    // The confirmation dialog has been removed from the parent,
    // so we can call the post action directly.
    onPostNow(currentArticle)
        .catch((error: any) => {
            // The parent component (`App.tsx`) is responsible for showing an alert to the user.
            // Here, we just log the error for debugging purposes and ensure the button state is reset.
            console.error("Post Now action failed:", error);
        })
        .finally(() => {
            // This component might be unmounted if the post was successful.
            // If the post failed, we need to reset the loading state of the button.
            setIsPosting(false);
        });
  };
  
  return (
    <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden flex flex-col">
      <div className="relative">
        <img src={currentArticle.imageUrl} alt={currentArticle.title} className="w-full h-48 object-cover" />
        {isRegeneratingImage && <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white">Regenerating...</div>}
      </div>
      <div className="p-6 flex-grow flex flex-col">
        <h3 className="text-xl font-bold text-cyan-400 mb-2">{isRegeneratingText ? 'Regenerating title...' : currentArticle.title}</h3>
        <p className="text-slate-300 flex-grow mb-4">{isRegeneratingText ? 'Regenerating content...' : currentArticle.content}</p>
        {currentArticle.imagePrompt && (
          <p className="text-xs text-slate-500 italic mb-4">
            <strong>Prompt:</strong> {currentArticle.imagePrompt}
          </p>
        )}
        <div className="mt-auto pt-4 border-t border-slate-700 flex flex-wrap gap-2 text-sm">
          <button 
            onClick={handleRegenerateText}
            disabled={isRegeneratingText}
            className="flex-auto bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-3 rounded transition disabled:opacity-50"
          >
            {isRegeneratingText ? '...' : 'Text'}
          </button>
          <button
            onClick={handleRegenerateImage}
            disabled={isRegeneratingImage || !currentArticle.imagePrompt}
            className="flex-auto bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-3 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRegeneratingImage ? '...' : 'Image'}
          </button>
          <button
            onClick={() => onSchedule(currentArticle)}
            className="flex-auto bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-3 rounded transition"
          >
            Schedule
          </button>
          <button
            onClick={handlePostNowClick}
            disabled={isPosting}
            className="flex-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 rounded transition disabled:opacity-50"
          >
            {isPosting ? 'Posting...' : 'Post Now'}
          </button>
          <button
            onClick={() => onDelete(currentArticle.id)}
            className="flex-auto bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-3 rounded transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

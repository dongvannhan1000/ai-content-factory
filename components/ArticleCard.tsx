import React, { useState } from 'react';
import { Article, GeneratedArticleText, GeneratedArticleTextFromImage } from '../types';
import { regenerateImagePrompt } from '@/services/geminiService';

interface ArticleCardProps {
  article: Article;
  onRegenerateText: (article: Article, customPrompt?: string) => Promise<GeneratedArticleText | GeneratedArticleTextFromImage>;
  onRegenerateImage: (article: Article, customPrompt?: string) => Promise<string>;
  onSchedule: (article: Article) => void;
  onDelete: (id: string) => void;
  onPostNow: (article: Article) => Promise<void>;
  defaultSystemPrompt: string;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ 
  article, 
  onRegenerateText, 
  onRegenerateImage, 
  onSchedule, 
  onDelete, 
  onPostNow,
  defaultSystemPrompt 
}) => {
  const [isRegeneratingText, setIsRegeneratingText] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [currentArticle, setCurrentArticle] = useState(article);
  
  // Modal states
  const [showTextPromptModal, setShowTextPromptModal] = useState(false);
  const [showImagePromptModal, setShowImagePromptModal] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(defaultSystemPrompt);

  const handleApiError = (error: any): string => {
      console.error("API call failed:", error);
      if (typeof error.message === 'string' && error.message.includes("Requested entity was not found")) {
          return "Action failed (Error 404: Not Found).\n\nThis usually means the API key is invalid or deleted.\n\nPlease verify your API key in the Google Cloud Console.";
      }
      return "An unexpected error occurred. Please try again.";
  };

  const handleRegenerateTextClick = () => {
    setCustomPrompt(defaultSystemPrompt);
    setShowTextPromptModal(true);
  };

  const handleRegenerateTextConfirm = async () => {
    setShowTextPromptModal(false);
    setIsRegeneratingText(true);
    try {
      const newText = await onRegenerateText(currentArticle, customPrompt);
      setCurrentArticle(prev => ({ ...prev, ...newText }));
    } catch (error) {
      const errorMessage = handleApiError(error);
      alert(errorMessage);
    } finally {
      setIsRegeneratingText(false);
    }
  };

  const handleRegenerateImageClick = () => {
    if (!currentArticle.imagePrompt) {
      alert("Cannot regenerate image without an image prompt. This is only available for auto-generated articles.");
      return;
    }
    setCustomPrompt(defaultSystemPrompt);
    setShowImagePromptModal(true);
  };

  const handleRegenerateImageConfirm = async () => {
    setShowImagePromptModal(false);
    setIsRegeneratingImage(true);
    try {
      const newImageUrl = await onRegenerateImage(currentArticle, customPrompt);
      const newImagePrompt = await regenerateImagePrompt(article, customPrompt);
      setCurrentArticle(prev => ({ ...prev, imageUrl: newImageUrl, imagePrompt: newImagePrompt }));
    } catch (error) {
        const errorMessage = handleApiError(error);
        alert(errorMessage);
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  const handlePostNowClick = () => {
    setIsPosting(true);
    onPostNow(currentArticle)
        .catch((error: any) => {
            console.error("Post Now action failed:", error);
        })
        .finally(() => {
            setIsPosting(false);
        });
  };
  
  return (
    <>
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
              onClick={handleRegenerateTextClick}
              disabled={isRegeneratingText}
              className="flex-auto bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-3 rounded transition disabled:opacity-50"
            >
              {isRegeneratingText ? '...' : 'Text'}
            </button>
            <button
              onClick={handleRegenerateImageClick}
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

      {/* Text Regenerate Modal */}
      {showTextPromptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setShowTextPromptModal(false)}>
          <div className="bg-slate-800 rounded-lg shadow-2xl p-8 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">Customize Text Generation</h2>
            <p className="text-slate-400 mb-6">
              Adjust the system prompt to guide how the AI regenerates the article text.
            </p>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={8}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="e.g., You are a witty and sarcastic social media manager..."
            />
            <div className="mt-8 flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowTextPromptModal(false)}
                className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg transition duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerateTextConfirm}
                className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-6 rounded-lg transition duration-200"
              >
                Regenerate Text
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Regenerate Modal */}
      {showImagePromptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setShowImagePromptModal(false)}>
          <div className="bg-slate-800 rounded-lg shadow-2xl p-8 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">Customize Image Generation</h2>
            <p className="text-slate-400 mb-6">
              Adjust the system prompt to guide how the AI regenerates the image.
            </p>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={8}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="e.g., Create vibrant, eye-catching images..."
            />
            <div className="mt-8 flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowImagePromptModal(false)}
                className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg transition duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerateImageConfirm}
                className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-6 rounded-lg transition duration-200"
              >
                Regenerate Image
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
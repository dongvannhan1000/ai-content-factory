import React, { useState, useEffect } from 'react';

interface SystemPromptModalProps {
  isOpen: boolean;
  currentPrompt: string;
  onSave: (newPrompt: string) => void;
  onClose: () => void;
}

export const SystemPromptModal: React.FC<SystemPromptModalProps> = ({ isOpen, currentPrompt, onSave, onClose }) => {
  const [prompt, setPrompt] = useState(currentPrompt);

  useEffect(() => {
    setPrompt(currentPrompt);
  }, [currentPrompt, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (prompt.trim()) {
      onSave(prompt);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg shadow-2xl p-8 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Set System Prompt</h2>
        <p className="text-slate-400 mb-6">
          This prompt guides the AI's personality and response style for all content generation.
        </p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={8}
          className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="e.g., You are a witty and sarcastic social media manager..."
        />
        <div className="mt-8 flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg transition duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-6 rounded-lg transition duration-200"
          >
            Save Prompt
          </button>
        </div>
      </div>
    </div>
  );
};

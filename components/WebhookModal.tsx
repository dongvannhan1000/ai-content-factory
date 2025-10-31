import React, { useState, useEffect } from 'react';

interface WebhookModalProps {
  isOpen: boolean;
  currentWebhook: string;
  onSave: (newWebhook: string) => void;
  onClose: () => void;
}

export const WebhookModal: React.FC<WebhookModalProps> = ({ isOpen, currentWebhook, onSave, onClose }) => {
  const [webhook, setWebhook] = useState(currentWebhook);

  useEffect(() => {
    setWebhook(currentWebhook);
  }, [currentWebhook, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmedWebhook = webhook.trim();
    if (trimmedWebhook) {
      try {
        // Simple URL validation
        new URL(trimmedWebhook);
        onSave(trimmedWebhook);
      } catch (_) {
        alert("Please enter a valid URL (e.g., https://example.com).");
        return;
      }
    } else {
      // Allow clearing the webhook by saving an empty string
      onSave('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg shadow-2xl p-8 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Set Webhook URL</h2>
        <p className="text-slate-400 mb-6">
          Provide a URL to send generated content to when you click "Post Now". The data will be sent as a JSON POST request.
        </p>
        <input
          type="url"
          value={webhook}
          onChange={(e) => setWebhook(e.target.value)}
          className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="https://your-webhook-url.com/api/post"
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
            Save URL
          </button>
        </div>
      </div>
    </div>
  );
};

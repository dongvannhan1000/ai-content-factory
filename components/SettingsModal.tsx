// components/SettingsModal.tsx (Đã cập nhật)
import React, { useState, useEffect } from 'react';
import { UserSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  currentSettings: UserSettings;
  onSave: (newSettings: UserSettings) => void;
  onClose: () => void;
}

const ASPECT_RATIO_OPTIONS: UserSettings['vision']['imageAspectRatio'][] = [
  '1:1',
  '16:9',
  '9:16',
  '4:3',
  '3:4',
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, currentSettings, onSave, onClose }) => {
  const [settings, setSettings] = useState<UserSettings>(currentSettings);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSettings(currentSettings);
      setError(null);
    }
  }, [currentSettings, isOpen]);

  if (!isOpen) return null;

  /**
   * --- LOGIC QUAN TRỌNG ---
   * Hàm này giờ đây xử lý các input lồng nhau.
   * Nó mong đợi 'name' có dạng "group.key" (ví dụ: "ai.systemPrompt").
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const [group, key] = name.split('.') as [keyof UserSettings, string];

    if (group && key) {
      setSettings(prevSettings => ({
        ...prevSettings,
        [group]: {
          ...prevSettings[group],
          [key]: value,
        },
      }));
    }
  };

  const handleSave = () => {
    setError(null);
    const trimmedWebhook = settings.integration.webhookUrl.trim();

    if (trimmedWebhook) {
      try {
        new URL(trimmedWebhook);
      } catch (_) {
        setError("Webhook URL không hợp lệ. Vui lòng kiểm tra lại (ví dụ: https://example.com).");
        return;
      }
    }

    onSave({
      ...settings,
      integration: {
        ...settings.integration,
        webhookUrl: trimmedWebhook,
      },
    });
  };

  // Helper render, KHÔNG thay đổi
  const renderTextField = (name: string, label: string, placeholder: string, description: string, value: string) => (
    <div>
      <label htmlFor={name} className="block text-sm font-semibold text-slate-300 mb-2">{label}</label>
      <input
        type="text"
        id={name}
        name={name} // Sẽ là "group.key"
        value={value} // Giá trị được truyền vào
        onChange={handleChange}
        className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        placeholder={placeholder}
      />
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
  );

  // Helper render, KHÔNG thay đổi
  const renderTextArea = (name: string, label: string, placeholder: string, description: string, value: string) => (
    <div>
      <label htmlFor={name} className="block text-sm font-semibold text-slate-300 mb-2">{label}</label>
      <textarea
        id={name}
        name={name} // Sẽ là "group.key"
        value={value} // Giá trị được truyền vào
        onChange={handleChange}
        rows={5}
        className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        placeholder={placeholder}
      />
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-slate-800 rounded-lg shadow-2xl p-8 max-w-2xl w-full h-[90vh] overflow-y-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-cyan-400 mb-6">Settings</h2>
        
        <div className="space-y-6">
          
          <section>
            <h3 className="text-lg font-semibold text-white mb-4 border-b border-slate-700 pb-2">AI General</h3>
            <div className="space-y-4">
              {/* --- CẬP NHẬT 'name' VÀ 'value' --- */}
              {renderTextField('ai.contentLanguage', 'Content Language', 'e.g., Vietnamese', 'Ngôn ngữ chính cho nội dung.', settings.ai.contentLanguage)}
              {renderTextArea('ai.systemPrompt', 'System Prompt', 'e.g., You are a witty social media manager...', 'Hướng dẫn chung cho AI.', settings.ai.systemPrompt)}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-4 border-b border-slate-700 pb-2">AI Vision & Image</h3>
            <div className="space-y-4">
              {/* --- CẬP NHẬT 'name' VÀ 'value' --- */}
              {renderTextArea('vision.visionSystemPrompt', 'Vision System Prompt', 'e.g., Analyze this image...', 'Hướng dẫn cho AI khi phân tích ảnh.', settings.vision.visionSystemPrompt)}
              {renderTextField('vision.imagePromptSuffix', 'Image Prompt Suffix', 'e.g., 4k, photorealistic', 'Tự động thêm hậu tố vào prompt ảnh.', settings.vision.imagePromptSuffix)}
              
              <div>
                <label htmlFor="vision.imageAspectRatio" className="block text-sm font-semibold text-slate-300 mb-2">Image Aspect Ratio</label>
                <select
                  id="vision.imageAspectRatio"
                  name="vision.imageAspectRatio" // CẬP NHẬT
                  value={settings.vision.imageAspectRatio} // CẬP NHẬT
                  onChange={handleChange}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {ASPECT_RATIO_OPTIONS.map(ratio => (
                    <option key={ratio} value={ratio}>{ratio}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Tỷ lệ khung hình mặc định cho ảnh.</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-4 border-b border-slate-700 pb-2">Integrations</h3>
            <div className="space-y-4">
              {/* --- CẬP NHẬT 'name' VÀ 'value' --- */}
              {renderTextField('integration.webhookUrl', 'Webhook URL', 'https://your-api.com/post', 'Gửi dữ liệu JSON POST đến URL này.', settings.integration.webhookUrl)}
            </div>
          </section>

          {error && (
            <div className="text-red-400 bg-red-900/50 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-700 flex justify-end space-x-4">
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
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
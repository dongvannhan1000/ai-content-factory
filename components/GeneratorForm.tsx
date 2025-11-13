// FIX: Reconstructed the GeneratorForm component from the provided diff, creating a functional form component with state management for different generation modes.
import React, { useState } from 'react';
import { GenerationMode } from '../types';

interface GeneratorFormProps {
  onGenerate: (mode: GenerationMode, data: any, count: number) => void;
  isLoading: boolean;
}

export const GeneratorForm: React.FC<GeneratorFormProps> = ({ onGenerate, isLoading }) => {
  const [mode, setMode] = useState<GenerationMode>('topic');
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('English');
  const [articleCount, setArticleCount] = useState(5);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setImageFiles(files);
      
      const previews: string[] = [];
      let loadedCount = 0;
      
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          previews.push(reader.result as string);
          loadedCount++;
          if (loadedCount === files.length) {
            setImagePreviews(previews);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    switch (mode) {
      case 'topic':
        if (!topic) return alert('Please enter a topic.');
        onGenerate(mode, { topic, language }, articleCount);
        break;
      case 'image':
        if (imageFiles.length === 0) return alert('Please select at least one image.');
        onGenerate(mode, { images: imageFiles }, imageFiles.length);
        break;
      case 'website':
        if (!websiteUrl) return alert('Please enter a website URL.');
        onGenerate(mode, { websiteUrl }, 1);
        break;
    }
  };

  const renderFormFields = () => {
    switch (mode) {
      case 'topic':
        return (
          <>
            <div>
              <label htmlFor="topic" className="block text-slate-300 font-semibold mb-2">Topic</label>
              <input
                type="text"
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., The future of renewable energy"
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="language" className="block text-slate-300 font-semibold mb-2">Language</label>
                <input
                  type="text"
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label htmlFor="articleCount" className="block text-slate-300 font-semibold mb-2">Number of Articles</label>
                <input
                  id="articleCount"
                  type="number"
                  value={articleCount}
                  min="1"
                  max="100"
                  onChange={(e) => setArticleCount(parseInt(e.target.value, 10))}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
          </>
        );
      case 'image':
        return (
            <div>
                <label htmlFor="imageUpload" className="block text-slate-300 font-semibold mb-2">Upload Images</label>
                <input
                    type="file"
                    id="imageUpload"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
                />
                {imagePreviews.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <img key={index} src={preview} alt={`Preview ${index + 1}`} className="rounded-lg max-h-32 w-full object-cover" />
                    ))}
                  </div>
                )}
            </div>
        );
      case 'website':
        return (
            <div>
                <label htmlFor="websiteUrl" className="block text-slate-300 font-semibold mb-2">Website URL</label>
                <input
                    type="url"
                    id="websiteUrl"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <section className="bg-slate-800 p-8 rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold text-cyan-400 mb-6">Content Generator</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-slate-300 font-semibold mb-2">Generation Mode</label>
          <div className="flex bg-slate-700 rounded-lg p-1">
            <button type="button" onClick={() => setMode('topic')} className={`flex-1 p-2 rounded-md font-semibold transition ${mode === 'topic' ? 'bg-cyan-600 text-white' : 'hover:bg-slate-600'}`}>Topic</button>
            <button type="button" onClick={() => setMode('image')} className={`flex-1 p-2 rounded-md font-semibold transition ${mode === 'image' ? 'bg-cyan-600 text-white' : 'hover:bg-slate-600'}`}>Image</button>
            <button type="button" onClick={() => setMode('website')} className={`flex-1 p-2 rounded-md font-semibold transition ${mode === 'website' ? 'bg-cyan-600 text-white' : 'hover:bg-slate-600'}`}>Website</button>
          </div>
        </div>

        {renderFormFields()}

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-wait"
          >
            {isLoading ? 'Generating...' : mode === 'topic' ? 'Start Batch Generation' : `Generate Content from ${mode}`}
          </button>
        </div>
      </form>
    </section>
  );
};

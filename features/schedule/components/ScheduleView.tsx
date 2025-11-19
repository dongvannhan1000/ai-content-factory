import React from 'react';
import { ScheduledArticle } from '../../../types';

interface ScheduleViewProps {
  articles: ScheduledArticle[];
  onEdit: (article: ScheduledArticle) => void;
  onUnschedule: (docId: string) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ articles, onEdit, onUnschedule }) => {
  if (articles.length === 0) {
    return (
      <section className="bg-slate-800 p-8 rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Scheduled Posts</h2>
        <p className="text-slate-400">You have no articles scheduled for posting.</p>
      </section>
    );
  }

  return (
    <section className="bg-slate-800 p-8 rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold text-cyan-400 mb-6">Scheduled Posts</h2>
      <div className="space-y-4">
        {articles
          .slice() // Create a shallow copy to avoid mutating the original array
          .sort((a, b) => a.scheduledTime - b.scheduledTime)
          .map((article) => (
            <div key={article.docId} className="bg-slate-700 p-4 rounded-md flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-semibold text-white">{article.title}</p>
                <p className="text-sm text-cyan-300">{new Date(article.scheduledTime).toLocaleString()}</p>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => onEdit(article)} className="text-slate-300 hover:text-white transition px-3 py-1 rounded-md bg-slate-600 hover:bg-slate-500">Edit</button>
                <button onClick={() => onUnschedule(article.docId)} className="text-white hover:text-red-300 transition px-3 py-1 rounded-md bg-red-600 hover:bg-red-500">Unschedule</button>
              </div>
            </div>
          ))}
      </div>
    </section>
  );
};
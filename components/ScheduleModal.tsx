import React, { useState, useEffect } from 'react';
import { Article, ScheduledArticle } from '../types';

interface ScheduleModalProps {
  article: Article | ScheduledArticle | null;
  onClose: () => void;
  onSchedule: (article: Article | ScheduledArticle, date: number) => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({ article, onClose, onSchedule }) => {
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  useEffect(() => {
    if (article && 'scheduledTime' in article && article.scheduledTime) {
      const d = new Date(article.scheduledTime);
      setScheduleDate(d.toISOString().split('T')[0]); // YYYY-MM-DD
      setScheduleTime(d.toTimeString().split(' ')[0].substring(0, 5)); // HH:MM
    } else {
        const now = new Date();
        now.setHours(now.getHours() + 1); // Default to 1 hour from now
        setScheduleDate(now.toISOString().split('T')[0]);
        setScheduleTime(now.toTimeString().split(' ')[0].substring(0, 5));
    }
  }, [article]);

  if (!article) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleDate || !scheduleTime) {
        alert("Please select a valid date and time.");
        return;
    }
    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
    if (scheduledDateTime.getTime() < Date.now()) {
      alert("Cannot schedule for a time in the past.");
      return;
    }
    onSchedule(article, scheduledDateTime.getTime());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg shadow-2xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Schedule Article</h2>
        <p className="text-slate-300 mb-6 truncate"><strong>Title:</strong> {article.title}</p>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="date" className="block text-slate-300 font-semibold mb-2">Date</label>
              <input 
                type="date" 
                id="date" 
                value={scheduleDate}
                onChange={e => setScheduleDate(e.target.value)}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label htmlFor="time" className="block text-slate-300 font-semibold mb-2">Time</label>
              <input 
                type="time" 
                id="time"
                value={scheduleTime}
                onChange={e => setScheduleTime(e.target.value)}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-6 rounded-lg transition duration-200"
            >
              Confirm Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

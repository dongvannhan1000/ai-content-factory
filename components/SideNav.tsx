import React from 'react';
import { User } from '../types';

interface SideNavProps {
  user: User | null;
  onLogout: () => void;
  onSetSystemPrompt: () => void;
  systemPrompt: string;
  currentView: 'generator' | 'schedule';
  onSetView: (view: 'generator' | 'schedule') => void;
  onSetWebhook: () => void;
  webhookUrl: string;
}

// A simple icon component
const Icon = ({ path, className = 'w-6 h-6' }: { path: string; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d={path} clipRule="evenodd" />
  </svg>
);

export const SideNav: React.FC<SideNavProps> = ({ user, onLogout, onSetSystemPrompt, systemPrompt, currentView, onSetView, onSetWebhook, webhookUrl }) => {
  return (
    <aside className="bg-slate-800 text-slate-300 w-16 sm:w-64 fixed inset-y-0 left-0 z-30 flex flex-col shadow-lg">
      <div className="flex items-center justify-center sm:justify-start h-20 border-b border-slate-700 px-4">
        <Icon path="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5-10-5-10 5z" className="w-8 h-8 text-cyan-400" />
        <h1 className="hidden sm:block text-xl font-bold ml-2 text-white">ContentSpark</h1>
      </div>

      <nav className="flex-grow p-2 sm:p-4 space-y-2">
        <button
          onClick={() => onSetView('generator')}
          className={`w-full flex items-center p-3 rounded-lg transition group ${currentView === 'generator' ? 'bg-slate-700 text-white' : 'hover:bg-slate-700'}`}
        >
          <Icon path="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.553L16.5 21.75l-.398-1.197a3.375 3.375 0 00-2.456-2.456L12.75 18l1.197-.398a3.375 3.375 0 002.456-2.456L16.5 14.25l.398 1.197a3.375 3.375 0 002.456 2.456L20.25 18l-1.197.398a3.375 3.375 0 00-2.456 2.456z" />
          <span className="hidden sm:inline-block ml-3 font-semibold">Generator</span>
        </button>
        <button
          onClick={() => onSetView('schedule')}
          className={`w-full flex items-center p-3 rounded-lg transition group ${currentView === 'schedule' ? 'bg-slate-700 text-white' : 'hover:bg-slate-700'}`}
        >
          <Icon path="M6.75 3v2.25h10.5V3h-2.25V1.5a.75.75 0 00-1.5 0V3H9V1.5a.75.75 0 00-1.5 0V3H5.25v2.25h13.5V3H18v2.25h-1.5V3a.75.75 0 00-1.5 0v2.25H9.75V3H9V1.5a.75.75 0 00-1.5 0V3H6.75zM4.5 7.5A2.25 2.25 0 002.25 9.75v9A2.25 2.25 0 004.5 21h15a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0019.5 7.5h-15z" />
          <span className="hidden sm:inline-block ml-3 font-semibold">Scheduled Posts</span>
        </button>
        <div className="border-t border-slate-700 my-2"></div>
        <button
          onClick={onSetSystemPrompt}
          className="w-full flex items-center p-3 rounded-lg hover:bg-slate-700 transition group"
        >
          <Icon path="M10.325 4.317a1.5 1.5 0 011.35 0l6.25 3.249a1.5 1.5 0 010 2.868l-6.25 3.25a1.5 1.5 0 01-1.35 0L4.075 10.434a1.5 1.5 0 010-2.868l6.25-3.25zM10 6.138L5.15 8.75 10 11.363l4.85-2.613L10 6.138zM4.075 13.566l6.25 3.25a1.5 1.5 0 001.35 0l6.25-3.25a1.5 1.5 0 000-2.868L11.675 7.45a1.5 1.5 0 00-1.35 0L4.075 10.698a1.5 1.5 0 000 2.868z" />
          <span className="hidden sm:inline-block ml-3 font-semibold">System Prompt</span>
        </button>
        <div className="hidden sm:block px-3 text-xs text-slate-500 truncate">
          {systemPrompt}
        </div>
        <button
          onClick={onSetWebhook}
          className="w-full flex items-center p-3 rounded-lg hover:bg-slate-700 transition group"
        >
          <Icon path="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          <span className="hidden sm:inline-block ml-3 font-semibold">Webhook</span>
        </button>
        <div className="hidden sm:block px-3 text-xs text-slate-500 truncate">
          {webhookUrl || 'Not set'}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center font-bold text-white text-sm">
                {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:block ml-3">
                <p className="text-sm font-semibold text-white truncate max-w-[150px]">{user?.email}</p>
            </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center mt-4 p-3 rounded-lg hover:bg-red-800/50 text-red-400 transition"
        >
          <Icon path="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          <span className="hidden sm:inline-block ml-3 font-semibold">Logout</span>
        </button>
      </div>
    </aside>
  );
};
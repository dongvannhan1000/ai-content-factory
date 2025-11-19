import React from 'react';

interface LoaderProps {
    progress: number;
    total: number;
}

export const Loader: React.FC<LoaderProps> = ({ progress, total }) => {
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center justify-center my-16" role="status" aria-label="Loading content">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-cyan-500"></div>
      <p className="mt-4 text-slate-300 text-lg">
        Generating content... this may take a moment.
      </p>
      {total > 0 && (
          <div className="w-full max-w-md bg-slate-700 rounded-full h-4 mt-4">
              <div 
                className="bg-cyan-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${percentage}%`}}
              ></div>
          </div>
      )}
      <p className="mt-2 text-slate-400">{`Completed ${progress} of ${total} articles.`}</p>
    </div>
  );
};
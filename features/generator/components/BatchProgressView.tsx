import React from 'react';
import { GenerationJob } from '../../../types';

interface BatchProgressViewProps {
    jobs: GenerationJob[];
    onCancel: (jobId: string) => void;
}

interface JobProgressCardProps {
    job: GenerationJob;
    onCancel: (jobId: string) => void;
}

const JobProgressCard: React.FC<JobProgressCardProps> = ({ job, onCancel }) => {
    const percentage = job.count > 0 ? Math.round(((job.progress || 0) / job.count) * 100) : 0;
    const isFailed = job.status === 'failed';

    return (
        <div className="bg-slate-700 p-4 rounded-md">
            <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                <div className="flex-grow">
                    <p className="font-semibold text-white truncate pr-4">
                        Topic: "{job.topic}"
                    </p>
                    <p className={`text-sm font-medium ${isFailed ? 'text-red-400' : 'text-slate-300'}`}>
                        {isFailed ? 'Failed' : `${job.progress || 0} / ${job.count}`}
                    </p>
                </div>
                {!isFailed && (
                    <button
                        onClick={() => onCancel(job.docId)}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-3 rounded-lg text-sm transition"
                    >
                        Cancel
                    </button>
                )}
            </div>
            {isFailed ? (
                <p className="text-sm text-red-300">
                    Error: {job.error || 'An unknown error occurred.'}
                </p>
            ) : (
                <div className="w-full bg-slate-600 rounded-full h-2.5 mt-1">
                    <div
                        className="bg-cyan-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>
            )}
        </div>
    );
};


export const BatchProgressView: React.FC<BatchProgressViewProps> = ({ jobs, onCancel }) => {
    if (jobs.length === 0) {
        return null;
    }

    return (
        <section className="bg-slate-800 p-8 rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold text-cyan-400 mb-6">Batch Generation Progress</h2>
            <div className="space-y-4">
                {jobs.map((job) => (
                    <JobProgressCard key={job.docId} job={job} onCancel={onCancel} />
                ))}
            </div>
        </section>
    );
};
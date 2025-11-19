import React, { useState } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Article, ScheduledArticle } from './types';
import { useScheduler } from './hooks/useScheduler';
import { useGenerator } from './features/generator/hooks/useGenerator';

import { AuthPage } from './features/auth/components/AuthPage';
import { GeneratorForm } from './features/generator/components/GeneratorForm';
import { Loader } from './features/generator/components/Loader';
import { ArticleCard } from './features/articles/components/ArticleCard';
import { ScheduleView } from './features/schedule/components/ScheduleView';
import { ScheduleModal } from './features/schedule/components/ScheduleModal';
import { BatchProgressView } from './features/generator/components/BatchProgressView';
import { MainLayout } from './layouts/MainLayout';

import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { SettingsProvider, useSettings } from './features/settings/SettingsContext';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { settings } = useSettings();
  const [currentView, setCurrentView] = useState<'generator' | 'schedule'>('generator');
  const [scheduleModalArticle, setScheduleModalArticle] = useState<Article | ScheduledArticle | null>(null);

  const {
    articles,
    setArticles,
    isLoading,
    loadingProgress,
    loadingTotal,
    generationJobs,
    isBatchJobRunning,
    mode,
    setMode,
    handleGenerate,
    handleDelete,
    handleCancelJob,
    handlePostNow,
    completedJobId
  } = useGenerator(user, settings);

  const { scheduledArticles, scheduleArticle, unscheduleArticle } = useScheduler(user);

  const handleSchedule = (article: Article | ScheduledArticle) => {
    setScheduleModalArticle(article);
  };

  const handleConfirmSchedule = async (article: Article | ScheduledArticle, date: number) => {
    scheduleArticle(article, date);
    // If it was a newly generated article, remove it from the main view AND delete from generated_articles
    if (!('docId' in article)) {
      setArticles(prev => prev.filter(a => a.id !== article.id));
      // Delete from generated_articles collection
      if (user && completedJobId) {
        try {
          const articleDoc = doc(db, 'generated_articles', article.id);
          await deleteDoc(articleDoc);
        } catch (error) {
          console.error("Error deleting generated article:", error);
        }
      }
    }
    setScheduleModalArticle(null);
  };

  if (authLoading) {
    return (
      <div className="bg-slate-900 min-h-screen flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-cyan-500"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <MainLayout currentView={currentView} onSetView={setCurrentView}>
      {currentView === 'generator' && (
        <div className="space-y-8">
          <GeneratorForm onGenerate={handleGenerate} isLoading={isLoading || isBatchJobRunning} mode={mode} setMode={setMode} />
          {isLoading && !isBatchJobRunning ? (
            <Loader progress={loadingProgress} total={loadingTotal} />
          ) : isBatchJobRunning ? (
            <BatchProgressView jobs={generationJobs} onCancel={handleCancelJob} />
          ) : articles.length > 0 && (
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {articles.map(article => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onSchedule={handleSchedule}
                  onDelete={handleDelete}
                  onPostNow={handlePostNow}
                  mode={mode}
                  settings={settings}
                  defaultSystemPrompt={settings.ai.systemPrompt}
                />
              ))}
            </section>
          )}
        </div>
      )}
      {currentView === 'schedule' && (
        <ScheduleView
          articles={scheduledArticles}
          onEdit={handleSchedule}
          onUnschedule={unscheduleArticle}
        />
      )}

      {scheduleModalArticle && (
        <ScheduleModal
          article={scheduleModalArticle}
          onClose={() => setScheduleModalArticle(null)}
          onSchedule={handleConfirmSchedule}
        />
      )}
    </MainLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;

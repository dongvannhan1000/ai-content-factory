import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import {
  Article,
  GenerationMode,
  ScheduledArticle,
  User,
  GenerationJob,
  UserSettings,
} from './types';
import {
  generateArticlesFromImages,
  generateArticleFromWebsite,
  generateArticlesFromTopic,
  generateImage,
} from './services/geminiService';
import { useScheduler } from './hooks/useScheduler';

import { AuthPage } from './components/AuthPage';
import { SideNav } from './components/SideNav';
import { GeneratorForm } from './components/GeneratorForm';
import { Loader } from './components/Loader';
import { ArticleCard } from './components/ArticleCard';
import { ScheduleView } from './components/ScheduleView';
import { ScheduleModal } from './components/ScheduleModal';
import { BatchProgressView } from './components/BatchProgressView';
import { SettingsModal } from './components/SettingsModal';
import { flatten } from 'flat';

const DEFAULT_SETTINGS: UserSettings = {
  ai: {
    systemPrompt: 'You are an expert social media manager specializing in viral content.',
    contentLanguage: 'English',
  },
  vision: {
    visionSystemPrompt: '',
    imagePromptSuffix: '4k, detailed',
    imageAspectRatio: '1:1',
  },
  integration: {
    webhookUrl: '',
  },
};


function App() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingTotal, setLoadingTotal] = useState(0);
  const [generationJobs, setGenerationJobs] = useState<GenerationJob[]>([]);
  const [isBatchJobRunning, setIsBatchJobRunning] = useState(false);
  const [completedJobId, setCompletedJobId] = useState<string | null>(null);
  const [currentBatchJobId, setCurrentBatchJobId] = useState<string | null>(null);
  const isBatchJobRunningRef = useRef(false);
  const [mode, setMode] = useState<GenerationMode>('topic');

  const [currentView, setCurrentView] = useState<'generator' | 'schedule'>('generator');
  const [scheduleModalArticle, setScheduleModalArticle] = useState<Article | ScheduledArticle | null>(null);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);

  // QUAN TRỌNG: Quản lý tất cả settings bằng một state object
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const { scheduledArticles, scheduleArticle, unscheduleArticle } = useScheduler(user);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          // USER CŨ TỒN TẠI
          const userData = userDoc.data() as User;
          const fullUser = { ...userData, uid: firebaseUser.uid, email: firebaseUser.email };
          setUser(fullUser);

          // --- LOGIC GOM NHÓM VÀ MERGE AN TOÀN ---
          
          // 1. Lấy settings đã lưu (hoặc object rỗng nếu không có)
          const savedSettings = (userData.settings || {}) as Partial<UserSettings>; // Đây là chìa khóa!
          
          // 2. Merge từng nhóm lồng nhau
          const finalSettings: UserSettings = {
            ai: {
              ...DEFAULT_SETTINGS.ai,
              ...(savedSettings.ai || {}), // Merge parital 'ai' settings
            },
            vision: {
              ...DEFAULT_SETTINGS.vision,
              ...(savedSettings.vision || {}), // Merge partial 'vision' settings
            },
            integration: {
              ...DEFAULT_SETTINGS.integration,
              ...(savedSettings.integration || {}), // Merge partial 'integration' settings
            },
          };

          setSettings(finalSettings);
          
          // Tùy chọn: Nếu settings bị thiếu, hãy cập nhật CSDL
          // Điều này giúp "vá" dữ liệu cũ
          if (!userData.settings) {
            await setDoc(userDocRef, { settings: finalSettings }, { merge: true });
          }

        } else {
          // USER MỚI
          // Sử dụng hằng số DEFAULT_SETTINGS để tạo user
          const newUser: User = { 
            uid: firebaseUser.uid, 
            email: firebaseUser.email!, 
            settings: DEFAULT_SETTINGS // Dùng giá trị mặc định đầy đủ
          };
          await setDoc(userDocRef, newUser, { merge: true });
          
          setUser(newUser);
          setSettings(DEFAULT_SETTINGS); // Đặt state với giá trị mặc định
        }
      } else {
        // KHÔNG CÓ USER
        setUser(null);
        setSettings(DEFAULT_SETTINGS); // Reset về mặc định
      }
      setInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setGenerationJobs([]);
      setIsBatchJobRunning(false);
      return;
    }

    const jobsCollection = collection(db, 'generation_jobs');
    const q = query(
        jobsCollection,
        where('userId', '==', user.uid),
        where('status', 'in', ['pending', 'processing'])
    );

    const unsubscribe = onSnapshot(q, snapshot => {
        const jobs: GenerationJob[] = [];
        snapshot.forEach(doc => {
            jobs.push({ docId: doc.id, ...doc.data() } as GenerationJob);
        });
        
        // Check if a batch job just completed
        if (isBatchJobRunningRef.current && jobs.length === 0 && currentBatchJobId) {
            console.log('[Job Listener] Job completed, setting completedJobId:', currentBatchJobId);
            setCompletedJobId(currentBatchJobId);
            setCurrentBatchJobId(null); // Clear current job ID
        }

        setGenerationJobs(jobs);
        const isRunning = jobs.length > 0;
        setIsBatchJobRunning(isRunning);
        isBatchJobRunningRef.current = isRunning;
    });

    return () => unsubscribe();
}, [user, currentBatchJobId]);
  
  // Listen for generated articles from completed batch job
  useEffect(() => {
    if (!user || !completedJobId) {
      return;
    }

    console.log('[Articles Listener] Starting listener for jobId:', completedJobId);
    
    const articlesCollection = collection(db, 'generated_articles');
    const q = query(
        articlesCollection,
        where('userId', '==', user.uid),
        where('jobId', '==', completedJobId)
    );

    const unsubscribe = onSnapshot(q, snapshot => {
        console.log('[Articles Listener] Snapshot received, size:', snapshot.size);
        const batchArticles: Article[] = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log('[Articles Listener] Article doc:', doc.id, data);
            batchArticles.push({
                id: doc.id, // Use Firestore doc ID as article ID
                title: data.title,
                content: data.content,
                imageUrl: data.imageUrl,
                imagePrompt: data.imagePrompt,
                topic: data.topic,
            });
        });
        
        console.log('[Articles Listener] Setting articles, count:', batchArticles.length);
        setArticles(batchArticles);
        // Always set isLoading to false when we get results, even if empty
        setIsLoading(false);
    }, (error) => {
        console.error('[Articles Listener] Error:', error);
        setIsLoading(false);
    });

    return () => {
        console.log('[Articles Listener] Cleaning up listener for jobId:', completedJobId);
        unsubscribe();
    };
  }, [user, completedJobId]);
  
  const handleGenerate = async (mode: GenerationMode, data: any, count: number) => {
    setIsLoading(true);
    setLoadingProgress(0);
    setArticles([]);
    setCompletedJobId(null);
    setCurrentBatchJobId(null);

    // Logic for batch generation via Cloud Function
    if (mode === 'topic' && count > 1) {
        if (!user) {
            alert("You must be logged in to start a batch job.");
            setIsLoading(false);
            return;
        }
        try {
            const jobsCollection = collection(db, 'generation_jobs');
            const jobDoc = await addDoc(jobsCollection, {
                userId: user.uid,
                topic: data.topic,
                count: count,
                language: data.language,
                systemPrompt: settings.ai.systemPrompt,
                status: 'pending',
                progress: 0,
                createdAt: serverTimestamp(),
            });
            setCurrentBatchJobId(jobDoc.id);
            // No alert needed, the progress view will appear automatically.
        } catch (error) {
            console.error("Could not submit the generation job:", error);
            alert("Could not submit the generation job. Please check the console and try again.");
            setIsLoading(false);
        }
        return;
    }

    // Logic for single/interactive generation
    try {
        if (mode === 'topic') {
            setLoadingTotal(count);
            const generatedTexts = await generateArticlesFromTopic(data.topic, count, data.language, settings.ai.systemPrompt);
            const newArticles: Article[] = [];
            for (const text of generatedTexts) {
                const imageUrl = await generateImage(text.imagePrompt);
                newArticles.push({
                    id: uuidv4(),
                    ...text,
                    imageUrl,
                    topic: data.topic,
                });
                setLoadingProgress(prev => prev + 1);
            }
            setArticles(newArticles);
        } else if (mode === 'image') {
            setLoadingTotal(data.images.length);
            
            // First, convert uploaded images to data URLs for display
            const uploadedImageUrls = await Promise.all(
                data.images.map((image: File) => 
                    new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(image);
                    })
                )
            );
            
            // Generate articles from images (this uploads to Storage and calls Cloud Function)
            const generatedTexts = await generateArticlesFromImages(data.images, settings.ai.contentLanguage, settings.ai.systemPrompt);
            const newArticles: Article[] = [];
            
            for (let i = 0; i < generatedTexts.length; i++) {
                const text = generatedTexts[i];
                
                newArticles.push({
                    id: uuidv4(),
                    ...text,
                    imageUrl: uploadedImageUrls[i], // Use the uploaded image data URL for display
                });
                setLoadingProgress(prev => prev + 1);
            }
            setArticles(newArticles);
        } else { // website
            setLoadingTotal(1);
            const generatedText = await generateArticleFromWebsite(data.websiteUrl, settings.ai.language, settings.ai.systemPrompt);
            const imageUrl = await generateImage(generatedText.imagePrompt);
            setArticles([{
                id: uuidv4(),
                ...generatedText,
                imageUrl,
            }]);
            setLoadingProgress(1);
        }
    } catch (error: any) {
        console.error("Content generation failed:", error);
        let errorMessage = "An error occurred during content generation. Please check the console for details.";
        // FIX: Add specific error handling for invalid API key (404 Not Found).
        if (typeof error.message === 'string' && error.message.includes("Requested entity was not found")) {
            errorMessage = "Content generation failed (Error 404: Not Found).\n\nThis usually means the API key is invalid, has been deleted, or is not configured for this project.\n\nPlease verify your API key and project settings in the Google Cloud Console.";
        }
        alert(errorMessage);
    } finally {
        setIsLoading(false);
    }
  };


  const handleDelete = async (id: string) => {
      setArticles(articles.filter(a => a.id !== id));
      // Also delete from generated_articles collection if it exists there
      if (user && completedJobId) {
          try {
              const articleDoc = doc(db, 'generated_articles', id);
              await deleteDoc(articleDoc);
          } catch (error) {
              console.error("Error deleting generated article:", error);
          }
      }
  };
  
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

  const handlePostNow = async (article: Article) => {
    if (!settings.integration.webhookUrl) {
      alert("Please set a Webhook URL in the settings first.");
      throw new Error("Webhook URL is not set.");
    }
    try {
      const response = await fetch(settings.integration.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          content: article.content,
          imageUrl: article.imageUrl,
        }),
      });
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Webhook failed with status ${response.status}: ${errorBody}`);
      }
      alert("Article posted successfully!");
      handleDelete(article.id);
    } catch (error) {
      console.error("Failed to post article:", error);
      alert(`Failed to post article. See console for details.`);
      throw error;
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const handleSaveSettings = async (newSettings: UserSettings) => {
    setSettings(newSettings);
    if (user) {
        try {
            const userDocRef = doc(db, 'users', user.uid);
            
            // SỬA LỖI: Bọc 'newSettings' vào trong một object '{ settings: ... }'
            // Sử dụng "dot notation" để cập nhật chính xác trường lồng nhau
            // Hoặc đơn giản là setDoc với object cha
            await setDoc(userDocRef, 
                { 
                    settings: newSettings // <--- SỬA LỖI NẰM Ở ĐÂY
                }, 
                { merge: true } // 'merge: true' đảm bảo chúng ta không ghi đè các trường khác
            );
            
            console.log('Settings updated successfully!');

        } catch (error) {
            console.error("Error updating settings:", error);
            // Bạn nên hiển thị thông báo lỗi cho người dùng ở đây
        }
    }
    setSettingsModalOpen(false);
    
    // (Bạn cũng có thể gọi API để lưu vào database ở đây)
    console.log('Settings saved:', newSettings);
  };

  const handleCancelJob = async (jobId: string) => {
    if (!user) return;
    try {
        const jobDoc = doc(db, 'generation_jobs', jobId);
        await updateDoc(jobDoc, {
            status: 'cancelled',
        });
    } catch (error) {
        console.error("Failed to cancel job:", error);
        alert("Could not cancel the job. Please try again.");
    }
  };

  if (initializing) {
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
    <div className="bg-slate-900 min-h-screen text-slate-200">
        <SideNav
            user={user}
            onLogout={handleLogout}
            onSetSettings={() => setSettingsModalOpen(true)}
            currentView={currentView}
            onSetView={setCurrentView}
        />
        <main className="pl-16 sm:pl-64">
            <div className="p-4 sm:p-8">
                {currentView === 'generator' && (
                    <div className="space-y-8">
                        <GeneratorForm onGenerate={handleGenerate} isLoading={isLoading || isBatchJobRunning} mode={mode} setMode={setMode}/>
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
            </div>
        </main>

        {scheduleModalArticle && (
            <ScheduleModal
                article={scheduleModalArticle}
                onClose={() => setScheduleModalArticle(null)}
                onSchedule={handleConfirmSchedule}
            />
        )}
        
        <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        currentSettings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

export default App;
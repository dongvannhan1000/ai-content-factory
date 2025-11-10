import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { Article, ScheduledArticle, User } from '../types';

export const useScheduler = (user: User | null) => {
    const [scheduledArticles, setScheduledArticles] = useState<ScheduledArticle[]>([]);

    useEffect(() => {
        if (!user) {
            setScheduledArticles([]);
            return;
        }

        const schedulesCollection = collection(db, 'schedules');
        const q = query(schedulesCollection, where('userId', '==', user.uid));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const articles: ScheduledArticle[] = [];
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const scheduledTime = data.scheduledTime instanceof Timestamp
                    ? data.scheduledTime.toMillis()
                    : data.scheduledTime;
                
                articles.push({
                    ...(data as Article),
                    userId: data.userId,
                    docId: docSnap.id,
                    scheduledTime: scheduledTime
                });
            });
            setScheduledArticles(articles);
        }, (error) => {
            console.error("Error fetching schedule from Firestore:", error);
        });

        return () => unsubscribe();
    }, [user]);

    const scheduleArticle = useCallback(async (article: Article | ScheduledArticle, date: number) => {
        if (!user) return;

        if ('docId' in article && article.docId) {
            const docRef = doc(db, 'schedules', article.docId);
            await updateDoc(docRef, {
                scheduledTime: Timestamp.fromDate(new Date(date))
            });
        } else {
            await addDoc(collection(db, 'schedules'), {
                ...article,
                userId: user.uid,
                scheduledTime: Timestamp.fromDate(new Date(date)),
            });
        }
    }, [user]);

    const unscheduleArticle = useCallback(async (docId: string) => {
        if (!user || !docId) return;
        try {
            const docRef = doc(db, 'schedules', docId);
            await deleteDoc(docRef);
        } catch (error) {
            console.error("Error unscheduling article:", error);
        }
    }, [user]);

    return {
        scheduledArticles,
        scheduleArticle,
        unscheduleArticle,
    };
};

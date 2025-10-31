import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
// FIX: Use firebase v8 compat imports and syntax.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { Article, ScheduledArticle, User } from '../types';

// FIX: Get Timestamp from the firebase v8 namespace.
const { Timestamp } = firebase.firestore;

export const useScheduler = (user: User | null) => {
    const [scheduledArticles, setScheduledArticles] = useState<ScheduledArticle[]>([]);

    useEffect(() => {
        if (!user) {
            setScheduledArticles([]);
            return;
        }

        // FIX: Use v8 compat syntax for collection and query.
        const schedulesCollection = db.collection('schedules');
        const q = schedulesCollection.where('userId', '==', user.uid);

        // FIX: Use v8 compat `onSnapshot` method from the query object.
        const unsubscribe = q.onSnapshot((querySnapshot) => {
            const articles: ScheduledArticle[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Ensure scheduledTime is handled correctly from Firestore Timestamp
                const scheduledTime = data.scheduledTime instanceof Timestamp
                    ? data.scheduledTime.toMillis()
                    : data.scheduledTime;
                
                // FIX: Cast `data` to include `userId` to satisfy the `ScheduledArticle` type.
                // The `userId` field is guaranteed to exist due to the Firestore query.
                articles.push({
                    ...(data as Article),
                    userId: data.userId,
                    docId: doc.id,
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

        // Check if it's an update by looking for docId
        if ('docId' in article && article.docId) {
            // FIX: Use v8 compat syntax for doc and update.
             const docRef = db.collection('schedules').doc(article.docId);
             await docRef.update({
                 scheduledTime: Timestamp.fromDate(new Date(date))
             });
        } else {
            // Create a new schedule document
            // FIX: Use v8 compat syntax for collection and add.
            await db.collection('schedules').add({
                ...article,
                userId: user.uid,
                scheduledTime: Timestamp.fromDate(new Date(date)),
            });
        }
    }, [user]);

    const unscheduleArticle = useCallback(async (docId: string) => {
        if (!user || !docId) return;
        try {
            // FIX: Use v8 compat syntax for doc and delete.
            const docRef = db.collection('schedules').doc(docId);
            await docRef.delete();
        } catch (error) {
            console.error("Error unscheduling article:", error);
        }
    }, [user]);

    // Note: The logic for CHECKING and POSTING scheduled articles should be handled by a server-side
    // function (e.g., a Cloud Function triggered by Cloud Scheduler) to work even when the user's browser is closed.
    // The client-side interval is removed as it doesn't fulfill the requirement.

    return {
        scheduledArticles,
        scheduleArticle,
        unscheduleArticle,
    };
};

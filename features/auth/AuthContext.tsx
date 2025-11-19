import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../../firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User } from '../../types';
import { DEFAULT_SETTINGS } from '../../constants';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    // Existing user
                    const userData = userDoc.data() as User;
                    const fullUser = { ...userData, uid: firebaseUser.uid, email: firebaseUser.email };
                    setUser(fullUser);
                } else {
                    // New user
                    const newUser: User = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email!,
                        settings: DEFAULT_SETTINGS
                    };
                    await setDoc(userDocRef, newUser, { merge: true });
                    setUser(newUser);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        await signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

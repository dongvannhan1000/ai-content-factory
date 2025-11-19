import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { UserSettings } from '../../types';
import { DEFAULT_SETTINGS } from '../../constants';
import { useAuth } from '../auth/AuthContext';

interface SettingsContextType {
    settings: UserSettings;
    updateSettings: (newSettings: UserSettings) => Promise<void>;
    loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            if (!user) {
                setSettings(DEFAULT_SETTINGS);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const savedSettings = (userData.settings || {}) as Partial<UserSettings>;

                    const finalSettings: UserSettings = {
                        ai: {
                            ...DEFAULT_SETTINGS.ai,
                            ...(savedSettings.ai || {}),
                        },
                        vision: {
                            ...DEFAULT_SETTINGS.vision,
                            ...(savedSettings.vision || {}),
                        },
                        integration: {
                            ...DEFAULT_SETTINGS.integration,
                            ...(savedSettings.integration || {}),
                        },
                    };

                    setSettings(finalSettings);

                    // Optional: Backfill settings if missing
                    if (!userData.settings) {
                        await setDoc(userDocRef, { settings: finalSettings }, { merge: true });
                    }
                } else {
                    setSettings(DEFAULT_SETTINGS);
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
                setSettings(DEFAULT_SETTINGS);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [user]);

    const updateSettings = async (newSettings: UserSettings) => {
        setSettings(newSettings);
        if (user) {
            try {
                const userDocRef = doc(db, 'users', user.uid);
                await setDoc(userDocRef, { settings: newSettings }, { merge: true });
                console.log('Settings updated successfully!');
            } catch (error) {
                console.error("Error updating settings:", error);
                // Ideally, revert state or show notification
            }
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

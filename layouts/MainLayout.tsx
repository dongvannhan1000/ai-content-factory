import React, { useState } from 'react';
import { SideNav } from '../features/navigation/components/SideNav';
import { SettingsModal } from '../features/settings/components/SettingsModal';
import { useAuth } from '../features/auth/AuthContext';
import { useSettings } from '../features/settings/SettingsContext';

interface MainLayoutProps {
    children: React.ReactNode;
    currentView: 'generator' | 'schedule';
    onSetView: (view: 'generator' | 'schedule') => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, currentView, onSetView }) => {
    const { user, logout } = useAuth();
    const { settings, updateSettings } = useSettings();
    const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);

    if (!user) return null;

    return (
        <div className="bg-slate-900 min-h-screen text-slate-200">
            <SideNav
                user={user}
                onLogout={logout}
                onSetSettings={() => setSettingsModalOpen(true)}
                currentView={currentView}
                onSetView={onSetView}
            />
            <main className="pl-16 sm:pl-64">
                <div className="p-4 sm:p-8">
                    {children}
                </div>
            </main>

            <SettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setSettingsModalOpen(false)}
                currentSettings={settings}
                onSave={updateSettings}
            />
        </div>
    );
};

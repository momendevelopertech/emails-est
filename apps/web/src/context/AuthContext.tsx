'use client';

import { createContext, ReactNode, useCallback, useContext } from 'react';
import { useRouter } from 'next/navigation';
import api, { clearApiCache, clearBrowserRuntimeCache, refreshSession as refreshSessionRequest } from '@/lib/api';
import { useAuthStore, UserProfile } from '@/stores/auth-store';

export type AuthContextValue = {
    user: UserProfile | null;
    refreshSession: () => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
    locale,
    children,
}: {
    locale: string;
    children: ReactNode;
}) {
    const router = useRouter();
    const { user, setUser, setBootstrapped } = useAuthStore();

    const refreshSession = useCallback(async () => {
        await refreshSessionRequest();
    }, []);

    const logout = useCallback(async () => {
        if (typeof window !== 'undefined') {
            window.sessionStorage.setItem('sphinx-logged-out', '1');
        }
        try {
            await api.post('/auth/logout', {}, { headers: { 'x-skip-activity': '1' } });
        } catch {
            // Ignore logout network errors and continue client-side sign out.
        }
        await clearBrowserRuntimeCache();
        clearApiCache();
        setUser(null);
        setBootstrapped(false);
        router.push(`/${locale}/login`);
    }, [locale, router, setBootstrapped, setUser]);

    return (
        <AuthContext.Provider value={{ user, refreshSession, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuthContext must be used within AuthProvider');
    }
    return context;
};

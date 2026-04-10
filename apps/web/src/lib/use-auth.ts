'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { getErrorStatus } from '@/lib/api/axios';
import { useAuthStore } from '@/stores/auth-store';

export function useRequireAuth(locale: string) {
    const router = useRouter();
    const { user, bootstrapped, setUser, setLoading, setBootstrapped } = useAuthStore();
    const [ready, setReady] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const attemptedRef = useRef(false);
    const verifiedRef = useRef(false);

    useEffect(() => {
        const loggedOut = typeof window !== 'undefined' && window.sessionStorage.getItem('sphinx-logged-out') === '1';

        if (!user || !bootstrapped) {
            verifiedRef.current = false;
        }

        if (!user) {
            setReady(false);
            if (loggedOut) {
                setIsChecking(false);
                setLoading(false);
                router.push(`/${locale}/login`);
                return;
            }
        }

        if (bootstrapped && user && verifiedRef.current) {
            setReady(true);
            setIsChecking(false);
            setError(null);
            setLoading(false);
            return;
        }

        if (attemptedRef.current) return;
        attemptedRef.current = true;

        let active = true;
        const boot = async () => {
            try {
                setError(null);
                if (loggedOut) {
                    setIsChecking(false);
                    router.push(`/${locale}/login`);
                    return;
                }
                await api.get('/auth/csrf');
                if (bootstrapped && user) {
                    await api.post('/auth/refresh', {});
                    if (!active) return;
                    if (typeof window !== 'undefined') {
                        window.sessionStorage.removeItem('sphinx-logged-out');
                    }
                    verifiedRef.current = true;
                    setReady(true);
                    setIsChecking(false);
                    return;
                }

                const res = await api.get('/auth/me');
                if (!active) return;
                if (typeof window !== 'undefined') {
                    window.sessionStorage.removeItem('sphinx-logged-out');
                }
                setUser(res.data);
                setBootstrapped(true);
                verifiedRef.current = true;
                setReady(true);
                setIsChecking(false);
            } catch (error) {
                const status = getErrorStatus(error);
                const isAuthFailure = status === 401 || status === 403;

                if (isAuthFailure) {
                    if (typeof window !== 'undefined') {
                        window.sessionStorage.setItem('sphinx-logged-out', '1');
                    }
                    setUser(null);
                    setBootstrapped(false);
                    verifiedRef.current = false;
                    setIsChecking(false);
                    setError(null);
                    router.push(`/${locale}/login`);
                    return;
                }

                if (bootstrapped && user) {
                    verifiedRef.current = true;
                    setReady(true);
                    setIsChecking(false);
                    setError(null);
                    return;
                }

                verifiedRef.current = false;
                setReady(false);
                setIsChecking(false);
                setError('network');
            } finally {
                if (active) {
                    setLoading(false);
                }
                attemptedRef.current = false;
            }
        };
        setLoading(true);
        boot();
        return () => {
            active = false;
            attemptedRef.current = false;
        };
    }, [bootstrapped, locale, router, setBootstrapped, setLoading, setUser, user]);

    return { user, ready, isChecking, error };
}

'use client';

import { useEffect } from 'react';
import { clearBrowserRuntimeCache } from '@/lib/api';

const cleanupLegacyRuntime = async () => {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister().catch(() => undefined)));
    }

    if ('caches' in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((key) => window.caches.delete(key)));
    }
};

export default function ClientCacheManager({ buildId }: { buildId: string }) {
    useEffect(() => {
        const key = 'app-build-id';
        const previousBuild = window.localStorage.getItem(key);
        const isNewBuild = previousBuild && previousBuild !== buildId;

        if (isNewBuild) {
            clearBrowserRuntimeCache().finally(() => {
                window.localStorage.setItem(key, buildId);
                window.location.reload();
            });
            return;
        }

        window.localStorage.setItem(key, buildId);
        cleanupLegacyRuntime().catch(() => {
            // ignore browser cleanup errors
        });
    }, [buildId]);

    return null;
}

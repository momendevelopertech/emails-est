'use client';

import { useEffect } from 'react';

export default function PwaRegistrar() {
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') return;
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator)) return;

        const debug = process.env.NEXT_PUBLIC_PWA_DEBUG === '1';

        navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
                if (debug) {
                    const scope = registration.scope || '/';
                    console.info('[PWA] Service worker registered:', scope);
                }
            })
            .catch((error) => {
                if (debug) {
                    console.warn('[PWA] Service worker registration failed:', error);
                }
            });
    }, []);

    return null;
}

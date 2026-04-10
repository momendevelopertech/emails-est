'use client';

import { useEffect } from 'react';
import { clearBrowserRuntimeCache } from '@/lib/api';

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
    }, [buildId]);

    return null;
}

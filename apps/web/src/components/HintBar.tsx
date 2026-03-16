'use client';

import { useEffect, useState } from 'react';

type Props = {
    message: string;
    storageKey?: string;
};

export default function HintBar({ message, storageKey = 'calHintDismissed' }: Props) {
    const [dismissed, setDismissed] = useState(true);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(storageKey);
            setDismissed(stored === 'true');
        } catch {
            setDismissed(false);
        }
    }, [storageKey]);

    if (dismissed) return null;

    const dismiss = () => {
        try {
            localStorage.setItem(storageKey, 'true');
        } catch {
            // Ignore storage errors
        }
        setDismissed(true);
    };

    return (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-ink/10 bg-white/80 px-3 py-2 text-sm text-ink/70">
            <span className="flex-1 text-right">{message}</span>
            <button className="btn-outline border-0 px-2 py-1 text-xs" onClick={dismiss} aria-label="إغلاق">
                ✕
            </button>
        </div>
    );
}

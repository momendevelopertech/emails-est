'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { addActivityListener } from '@/lib/api/axios';

const DEFAULT_WARNING_MS = 13 * 60 * 1000;
const DEFAULT_LOGOUT_MS = 15 * 60 * 1000;

export type SessionTimeoutOptions = {
    enabled: boolean;
    warningMs?: number;
    logoutMs?: number;
    onRefresh: () => Promise<void>;
    onLogout: () => Promise<void> | void;
};

export function useSessionTimeout({
    enabled,
    warningMs = DEFAULT_WARNING_MS,
    logoutMs = DEFAULT_LOGOUT_MS,
    onRefresh,
    onLogout,
}: SessionTimeoutOptions) {
    const [warningOpen, setWarningOpen] = useState(false);
    const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const logoutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const refreshingRef = useRef(false);

    const clearTimers = useCallback(() => {
        if (warningTimeoutRef.current) {
            clearTimeout(warningTimeoutRef.current);
            warningTimeoutRef.current = null;
        }
        if (logoutTimeoutRef.current) {
            clearTimeout(logoutTimeoutRef.current);
            logoutTimeoutRef.current = null;
        }
    }, []);

    const scheduleTimers = useCallback(() => {
        clearTimers();
        warningTimeoutRef.current = setTimeout(() => {
            setWarningOpen(true);
        }, warningMs);
        logoutTimeoutRef.current = setTimeout(() => {
            setWarningOpen(false);
            onLogout();
        }, logoutMs);
    }, [clearTimers, logoutMs, onLogout, warningMs]);

    const markActivity = useCallback(() => {
        if (!enabled) return;
        setWarningOpen(false);
        scheduleTimers();
    }, [enabled, scheduleTimers]);

    const handleContinue = useCallback(async () => {
        if (refreshingRef.current) return;
        refreshingRef.current = true;
        try {
            await onRefresh();
            markActivity();
        } catch {
            await onLogout();
        } finally {
            refreshingRef.current = false;
        }
    }, [markActivity, onLogout, onRefresh]);

    const handleLogout = useCallback(async () => {
        await onLogout();
    }, [onLogout]);

    useEffect(() => {
        if (!enabled) {
            setWarningOpen(false);
            clearTimers();
            return;
        }
        scheduleTimers();
        return () => {
            clearTimers();
        };
    }, [clearTimers, enabled, scheduleTimers]);

    useEffect(() => {
        if (!enabled) return;
        const events: Array<keyof WindowEventMap> = ['mousemove', 'keydown', 'scroll'];
        const handler = () => markActivity();
        events.forEach((event) => window.addEventListener(event, handler, { passive: true }));
        const removeActivityListener = addActivityListener(markActivity);
        return () => {
            events.forEach((event) => window.removeEventListener(event, handler));
            removeActivityListener();
        };
    }, [enabled, markActivity]);

    return {
        warningOpen,
        handleContinue,
        handleLogout,
    };
}

'use client';

import { useTranslations } from 'next-intl';
import SessionTimeoutModal from '@/components/SessionTimeoutModal';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useAuthContext } from '@/context/AuthContext';

export default function SessionTimeoutManager() {
    const t = useTranslations('auth');
    const { user, refreshSession, logout } = useAuthContext();
    const loggedOut = typeof window !== 'undefined'
        && window.sessionStorage.getItem('sphinx-logged-out') === '1';
    const { warningOpen, handleContinue, handleLogout } = useSessionTimeout({
        enabled: !!user && !loggedOut,
        onRefresh: refreshSession,
        onLogout: logout,
    });

    return (
        <SessionTimeoutModal
            open={warningOpen}
            message={t('sessionExpiring')}
            continueLabel={t('sessionContinue')}
            logoutLabel={t('sessionLogout')}
            onContinue={handleContinue}
            onLogout={handleLogout}
        />
    );
}

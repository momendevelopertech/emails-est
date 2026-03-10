'use client';

import { useMemo } from 'react';
import { useRequireAuth } from '@/lib/use-auth';
import ChatLayout from '@/components/chat/ChatLayout';
import PageLoader from '@/components/PageLoader';

export default function SupportChatPageClient({ locale }: { locale: string }) {
    const { user, ready } = useRequireAuth(locale);

    const roleFilter = useMemo(() => {
        if (!user) return undefined;
        return user.role === 'SUPPORT' ? 'EMPLOYEE' : 'SUPPORT';
    }, [user]);

    if (!ready || !user) {
        return <PageLoader text={locale === 'ar' ? '???? ????? ????? ?????...' : 'Loading support chat...'} />;
    }

    return (
        <ChatLayout
            currentUser={{
                id: user.id,
                fullName: user.fullName,
                governorate: user.governorate,
                role: user.role,
            }}
            roleFilter={roleFilter}
            autoStart
            autoSelectFirst
        />
    );
}

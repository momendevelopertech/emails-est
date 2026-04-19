import { Suspense } from 'react';
import PublicRecipientResponseClient from '@/components/messaging/PublicRecipientResponseClient';

export default function PublicConfirmPage() {
    return (
        <Suspense fallback={null}>
            <PublicRecipientResponseClient />
        </Suspense>
    );
}

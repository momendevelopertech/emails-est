import { Suspense } from 'react';
import PublicRecipientResponseClient from '@/components/messaging/PublicRecipientResponseClient';

export default function PublicShortResponsePage() {
    return (
        <Suspense fallback={null}>
            <PublicRecipientResponseClient />
        </Suspense>
    );
}

import { Suspense } from 'react';
import type { Metadata } from 'next';
import PublicRecipientResponseClient from '@/components/messaging/PublicRecipientResponseClient';
import { getPublicResponseMetadata } from '@/lib/public-response-metadata';

export const generateMetadata = ({ params }: { params: { token: string; action: string } }): Metadata =>
    getPublicResponseMetadata({ token: params.token, action: params.action });

export default function PublicShortResponseActionPage({ params }: { params: { token: string; action: string } }) {
    return (
        <Suspense fallback={null}>
            <PublicRecipientResponseClient initialToken={params.token} initialAction={params.action} />
        </Suspense>
    );
}

import { Suspense } from 'react';
import type { Metadata } from 'next';
import PublicRecipientResponseClient from '@/components/messaging/PublicRecipientResponseClient';
import { getPublicResponseMetadata } from '@/lib/public-response-metadata';

export const generateMetadata = ({ params }: { params: { token: string } }): Metadata => getPublicResponseMetadata({ token: params.token });

export default function PublicShortResponsePage({ params }: { params: { token: string } }) {
    return (
        <Suspense fallback={null}>
            <PublicRecipientResponseClient initialToken={params.token} />
        </Suspense>
    );
}

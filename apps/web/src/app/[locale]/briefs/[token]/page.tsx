import { Suspense } from 'react';
import type { Metadata } from 'next';
import PublicHierarchyReviewClient from '@/components/messaging/PublicHierarchyReviewClient';
import { getPublicHierarchyReviewMetadata } from '@/lib/public-response-metadata';

export const generateMetadata = ({ params }: { params: { locale: string; token: string } }): Metadata =>
    getPublicHierarchyReviewMetadata({ token: params.token });

export default function LocalizedPublicHierarchyReviewPage({ params }: { params: { locale: string; token: string } }) {
    return (
        <Suspense fallback={null}>
            <PublicHierarchyReviewClient initialToken={params.token} />
        </Suspense>
    );
}

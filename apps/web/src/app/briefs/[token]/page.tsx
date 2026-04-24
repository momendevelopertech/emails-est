import { Suspense } from 'react';
import type { Metadata } from 'next';
import PublicHierarchyReviewClient from '@/components/messaging/PublicHierarchyReviewClient';
import { getPublicHierarchyReviewMetadata } from '@/lib/public-response-metadata';

export const generateMetadata = ({ params }: { params: { token: string } }): Metadata =>
    getPublicHierarchyReviewMetadata({ token: params.token });

export default function PublicHierarchyReviewPage({ params }: { params: { token: string } }) {
    return (
        <Suspense fallback={null}>
            <PublicHierarchyReviewClient initialToken={params.token} />
        </Suspense>
    );
}

import { ReactNode } from 'react';
import ClientCacheManager from '@/components/ClientCacheManager';

const APP_BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_APP_VERSION || 'dev';

export const metadata = {
    title: 'Emails EST',
    description: 'Bulk email and messaging workspace',
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <ClientCacheManager buildId={APP_BUILD_ID} />
            {children}
        </>
    );
}

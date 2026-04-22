import { ReactNode } from 'react';
import { cookies } from 'next/headers';
import ClientCacheManager from '@/components/ClientCacheManager';
import { defaultLocale } from '@/i18n/routing';

const APP_BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_APP_VERSION || 'dev';
const DEFAULT_DIR = defaultLocale === 'ar' ? 'rtl' : 'ltr';

export const metadata = {
    title: 'Emails EST',
    description: 'Bulk email and messaging workspace',
};

export default function RootLayout({ children }: { children: ReactNode }) {
    const localeCookie = cookies().get('NEXT_LOCALE')?.value;
    const locale = localeCookie || defaultLocale;
    const dir = locale === 'ar' ? 'rtl' : DEFAULT_DIR;

    return (
        <html lang={locale} dir={dir} suppressHydrationWarning>
            <body className="bg-atmosphere text-ink font-base">
                <ClientCacheManager buildId={APP_BUILD_ID} />
                {children}
            </body>
        </html>
    );
}

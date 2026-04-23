import './globals.css';
import { ReactNode } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import ClientCacheManager from '@/components/ClientCacheManager';
import { defaultLocale } from '@/i18n/routing';

const APP_BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_APP_VERSION || 'dev';
const DEFAULT_DIR = defaultLocale === 'ar' ? 'rtl' : 'ltr';
const DEFAULT_SITE_URL = 'https://emails-est-web.vercel.app';

const normalizeSiteUrl = (value?: string) => {
    if (!value) return DEFAULT_SITE_URL;

    const trimmed = value.trim();
    if (!trimmed) return DEFAULT_SITE_URL;
    if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/$/, '');
    if (trimmed.startsWith('//')) return `https:${trimmed}`.replace(/\/$/, '');
    return `https://${trimmed}`.replace(/\/$/, '');
};

const SITE_URL = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
);

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: 'Emails EST',
    description: 'Bulk email and messaging workspace',
    icons: {
        icon: '/icons/icon.svg',
        apple: '/icons/icon.svg',
    },
    openGraph: {
        title: 'Emails EST',
        description: 'Bulk email and messaging workspace',
        type: 'website',
        images: [
            {
                url: '/brand/est-og.jpg',
                width: 1200,
                height: 630,
                alt: 'Emails EST',
                type: 'image/jpeg',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Emails EST',
        description: 'Bulk email and messaging workspace',
        images: ['/brand/est-og.jpg'],
    },
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

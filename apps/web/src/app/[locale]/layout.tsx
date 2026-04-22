import { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Toaster } from 'react-hot-toast';
import { locales } from '@/i18n/routing';
import { AuthProvider } from '@/context/AuthContext';
import SessionTimeoutManager from '@/components/SessionTimeoutManager';
import ReactQueryProvider from '@/components/ReactQueryProvider';

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

export const metadata = {
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
        type: 'website' as const,
        images: [
            {
                url: '/brand/sphinx-logo.svg',
                width: 1200,
                height: 630,
                alt: 'Emails EST',
                type: 'image/svg+xml',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image' as const,
        title: 'Emails EST',
        description: 'Bulk email and messaging workspace',
        images: ['/brand/sphinx-logo.svg'],
    },
};

export default async function LocaleLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: { locale: string };
}) {
    if (!locales.includes(params.locale as any)) {
        notFound();
    }

    const locale = params.locale;
    return (
        <NextIntlClientProvider messages={await getMessages()}>
            <ReactQueryProvider>
                <AuthProvider locale={locale}>
                    <SessionTimeoutManager />
                    {children}
                    <Toaster position={locale === 'ar' ? 'top-left' : 'top-right'} />
                </AuthProvider>
            </ReactQueryProvider>
        </NextIntlClientProvider>
    );
}

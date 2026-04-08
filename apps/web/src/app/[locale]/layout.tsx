import '../globals.css';
import { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Toaster } from 'react-hot-toast';
import { defaultLocale, locales } from '@/i18n/routing';
import ClientCacheManager from '@/components/ClientCacheManager';
import PwaRegistrar from '@/components/PwaRegistrar';
import { AuthProvider } from '@/context/AuthContext';
import SessionTimeoutManager from '@/components/SessionTimeoutManager';
import ReactQueryProvider from '@/components/ReactQueryProvider';


const OG_IMAGE_URL = 'https://hr-web-ten.vercel.app/brand/sphinx-logo.png';

export const metadata = {
    title: 'SPHINX HR',
    description: 'Enterprise HR Management System',
    manifest: '/manifest.json',
    themeColor: '#1f3a52',
    icons: {
        icon: [
            { url: '/icons/icon.svg', type: 'image/svg+xml' },
            { url: '/brand/sphinx-head.svg', type: 'image/svg+xml' },
        ],
        apple: [{ url: '/icons/icon.svg', type: 'image/svg+xml' }],
        shortcut: ['/icons/icon.svg'],
    },
    openGraph: {
        title: 'SPHINX HR',
        description: 'Enterprise HR Management System',
        type: 'website' as const,
        images: [
            {
                url: OG_IMAGE_URL,
                width: 1200,
                height: 630,
                alt: 'SPHINX HR',
                type: 'image/png',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image' as const,
        title: 'SPHINX HR',
        description: 'Enterprise HR Management System',
        images: [OG_IMAGE_URL],
    },
};

export default async function LocaleLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: { locale: string };
}) {
    const locale = locales.includes(params.locale as any) ? params.locale : defaultLocale;
    if (!locale) notFound();
    const messages = await getMessages();
    const dir = locale === 'ar' ? 'rtl' : 'ltr';
    return (
        <html lang={locale} dir={dir}>
            <body className="bg-atmosphere text-ink font-base">
                <NextIntlClientProvider messages={messages}>
                    <ReactQueryProvider>
                        <AuthProvider locale={locale}>
                            <ClientCacheManager />
                            <PwaRegistrar />
                            <SessionTimeoutManager />
                            {children}
                            <Toaster position={locale === 'ar' ? 'top-left' : 'top-right'} />
                        </AuthProvider>
                    </ReactQueryProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}

import '../globals.css';
import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Toaster } from 'react-hot-toast';
import { Cairo } from 'next/font/google';
import ClientCacheManager from '@/components/ClientCacheManager';
import PwaRegistrar from '@/components/PwaRegistrar';
import { AuthProvider } from '@/context/AuthContext';
import SessionTimeoutManager from '@/components/SessionTimeoutManager';
import ReactQueryProvider from '@/components/ReactQueryProvider';
import { resolveRouteLocale } from '@/lib/route-locale';

const cairo = Cairo({
    subsets: ['arabic', 'latin'],
    variable: '--font-primary',
    weight: ['400', '500', '600', '700'],
    preload: false,
});

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
    params: { locale?: string } | Promise<{ locale?: string }>;
}) {
    const locale = await resolveRouteLocale(params);
    const messages = await getMessages();
    const dir = locale === 'ar' ? 'rtl' : 'ltr';
    const fontClass = cairo.variable;

    return (
        <html lang={locale} dir={dir} className={fontClass}>
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

import type { Metadata } from 'next';

const DEFAULT_SITE_URL = 'https://emails-est-web.vercel.app';

const normalizeSiteUrl = (value?: string) => {
    if (!value) return DEFAULT_SITE_URL;

    const trimmed = value.trim();
    if (!trimmed) return DEFAULT_SITE_URL;
    if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/$/, '');
    if (trimmed.startsWith('//')) return `https:${trimmed}`.replace(/\/$/, '');
    return `https://${trimmed}`.replace(/\/$/, '');
};

export const getSiteUrl = () => normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
);

export const getPublicResponseMetadata = (params?: { token?: string; action?: string }): Metadata => {
    const siteUrl = getSiteUrl();
    const baseUrl = new URL(siteUrl);
    const routePath = params?.token
        ? `/r/${encodeURIComponent(params.token)}${params?.action ? `/${encodeURIComponent(params.action)}` : ''}`
        : '/r';
    const pageUrl = new URL(routePath, siteUrl).toString();
    const ogImageUrl = new URL('/brand/est-og.jpg', siteUrl).toString();

    return {
        metadataBase: baseUrl,
        title: 'EST Exam Response',
        description: 'Confirm your attendance or send an apology.',
        icons: {
            icon: '/icons/icon.svg',
            apple: '/icons/icon.svg',
        },
        alternates: {
            canonical: pageUrl,
        },
        openGraph: {
            title: 'EST Exam Response',
            description: 'Confirm your attendance or send an apology.',
            url: pageUrl,
            siteName: 'Emails EST',
            type: 'website',
            images: [
                {
                    url: ogImageUrl,
                    width: 1200,
                    height: 630,
                    alt: 'EST logo',
                    type: 'image/jpeg',
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: 'EST Exam Response',
            description: 'Confirm your attendance or send an apology.',
            images: [ogImageUrl],
        },
    };
};

/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
});

const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig = {
    reactStrictMode: true,
    images: {
        domains: ['res.cloudinary.com', 'lh3.googleusercontent.com'],
    },
    async rewrites() {
        const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';
        const normalizedApiUrl = rawApiUrl
            .trim()
            .replace(/\/$/, '')
            .replace(/\/api$/, '');

        if (!normalizedApiUrl || normalizedApiUrl.startsWith('/')) {
            return [];
        }

        return [
            {
                source: '/api/:path*',
                destination: `${normalizedApiUrl}/api/:path*`,
            },
        ];
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-XSS-Protection', value: '1; mode=block' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                ],
            },
        ];
    },
};

module.exports = withNextIntl(withPWA(nextConfig));

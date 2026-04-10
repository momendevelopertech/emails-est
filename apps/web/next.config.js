/** @type {import('next').NextConfig} */
const path = require('path');
const dotenv = require('dotenv');

[
    path.resolve(__dirname, '.env.local'),
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '../../.env.local'),
    path.resolve(__dirname, '../../.env'),
].forEach((envPath) => {
    dotenv.config({ path: envPath });
});

const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const stripApiSuffix = (value) => value.replace(/\/api\/?$/i, '');

const resolveApiRewriteTarget = () => {
    const configured = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || '').trim();
    if (!configured || configured === '/api') {
        return process.env.NODE_ENV === 'production'
            ? 'https://emails-est-api.vercel.app'
            : 'http://localhost:3001';
    }
    if (/^https?:\/\//i.test(configured)) {
        return stripApiSuffix(configured.replace(/\/$/, ''));
    }
    if (configured.startsWith('//')) {
        return stripApiSuffix(`https:${configured}`.replace(/\/$/, ''));
    }
    if (configured.startsWith('/')) {
        return process.env.NODE_ENV === 'production'
            ? 'https://emails-est-api.vercel.app'
            : 'http://localhost:3001';
    }
    const scheme = /^(localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/i.test(configured) ? 'http://' : 'https://';
    return stripApiSuffix(`${scheme}${configured}`.replace(/\/$/, ''));
};

const nextConfig = {
    reactStrictMode: true,
    allowedDevOrigins: ['127.0.0.1', 'localhost', '*.localhost'],
    images: {
        domains: ['res.cloudinary.com', 'lh3.googleusercontent.com', 'emails-est-web.vercel.app'],
    },
    async rewrites() {
        const target = resolveApiRewriteTarget();
        return [
            {
                source: '/api/:path*',
                destination: `${target}/:path*`,
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

module.exports = withNextIntl(nextConfig);

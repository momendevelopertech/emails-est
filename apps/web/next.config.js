/** @type {import('next').NextConfig} */
const path = require('path');
const dotenv = require('dotenv');
const defaultRuntimeCaching = require('next-pwa/cache');

[
    path.resolve(__dirname, '.env.local'),
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '../../.env.local'),
    path.resolve(__dirname, '../../.env'),
].forEach((envPath) => {
    dotenv.config({ path: envPath });
});

const runtimeCaching = [
    // Block caching for dynamic API traffic (always network).
    {
        urlPattern: /^\/api\/.*/i,
        handler: 'NetworkOnly',
        options: {
            cacheName: 'api-runtime-local',
        },
    },
    {
        urlPattern: /^https?:\/\/[^/]+\/api\/.*/i,
        handler: 'NetworkOnly',
        options: {
            cacheName: 'api-runtime-remote',
        },
    },
    // Keep default runtime caching for static assets/fonts/images, but drop any generic api rule if present.
    ...defaultRuntimeCaching.filter(
        (rule) => !(rule.urlPattern && /api/i.test(rule.urlPattern.toString())),
    ),
];

const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    clientsClaim: true,
    disable: process.env.NODE_ENV === 'development',
    buildExcludes: [/app-build-manifest\.json$/],
    runtimeCaching,
});

const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');


const resolveApiRewriteTarget = () => {
    const configured = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || '').trim();
    if (!configured || configured === '/api') {
        return process.env.NODE_ENV === 'production'
            ? 'https://emails-est-api.vercel.app/api'
            : 'http://localhost:3001/api';
    }
    if (/^https?:\/\//i.test(configured)) {
        return configured.replace(/\/$/, '');
    }
    if (configured.startsWith('//')) {
        return `https:${configured}`.replace(/\/$/, '');
    }
    if (configured.startsWith('/')) {
        return process.env.NODE_ENV === 'production'
            ? 'https://emails-est-api.vercel.app/api'
            : 'http://localhost:3001/api';
    }
    const scheme = /^(localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/i.test(configured) ? 'http://' : 'https://';
    return `${scheme}${configured}`.replace(/\/$/, '');
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

module.exports = withNextIntl(withPWA(nextConfig));

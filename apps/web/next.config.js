/** @type {import('next').NextConfig} */
const defaultRuntimeCaching = require('next-pwa/cache');

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

const nextConfig = {
    reactStrictMode: true,
    images: {
        domains: ['res.cloudinary.com', 'lh3.googleusercontent.com'],
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

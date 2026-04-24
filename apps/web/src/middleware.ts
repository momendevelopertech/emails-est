import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { defaultLocale, locales } from './i18n/routing';

const intlMiddleware = createMiddleware({
    locales,
    defaultLocale,
    localePrefix: 'always',
});

// Simple string-prefix paths that are fully public (no auth required at all).
const publicPaths = new Set(['login', 'forgot-password', 'reset-password', 'unauthorized']);

// Path prefixes (after locale) that are publicly accessible (no auth redirect).
const publicPathPrefixes = ['requests/print', 'messaging/confirm', 'r/', 'briefs/'];

export default function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (pathname === '/r' || pathname.startsWith('/r/')) {
        return NextResponse.next();
    }

    if (pathname === '/briefs' || pathname.startsWith('/briefs/')) {
        return NextResponse.next();
    }

    const segments = pathname.split('/').filter(Boolean);
    const locale = segments[0];
    const route = segments[1] || '';

    if (locale && locales.includes(locale as any) && route === 'r') {
        const target = new URL(`/r/${segments.slice(2).join('/')}`, req.url);
        target.search = req.nextUrl.search;
        return NextResponse.redirect(target);
    }

    if (locale && locales.includes(locale as any) && route === 'briefs') {
        const target = new URL(`/briefs/${segments.slice(2).join('/')}`, req.url);
        target.search = req.nextUrl.search;
        return NextResponse.redirect(target);
    }

    // e.g. "requests/print" from /ar/requests/print/leave/123
    const subPath = segments.slice(1).join('/');

    const isPublicRoute =
        !route ||                   // locale root: /ar or /en (no sub-route)
        publicPaths.has(route) ||
        publicPathPrefixes.some((prefix) => subPath.startsWith(prefix));

    if (locale && locales.includes(locale as any) && !isPublicRoute) {
        const hasAccessToken = !!req.cookies.get('access_token')?.value;
        const hasRefreshToken = !!req.cookies.get('refresh_token')?.value;

        if (!hasAccessToken && !hasRefreshToken) {
            return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
        }
    }

    return intlMiddleware(req);
}

export const config = {
    matcher: ['/((?!api|_next|.*\\..*).*)'],
};

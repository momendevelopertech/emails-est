type CookieSameSite = 'lax' | 'none' | 'strict';
type CookieMode = 'same-site' | 'cross-site';

export type AuthCookieSettings = {
    sameSite: CookieSameSite;
    secure: boolean;
    domain?: string;
    path: '/';
};

const hasScheme = (value: string) => /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
const isLocalhost = (value: string) => /^(https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/i.test(value);
const DEFAULT_PROD_FRONTEND_ORIGIN = 'https://emails-est-web.vercel.app';

const ensureAbsoluteUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    if (hasScheme(trimmed)) return trimmed;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    if (isLocalhost(trimmed)) return `http://${trimmed.replace(/^https?:\/\//i, '')}`;
    return `https://${trimmed}`;
};

const normalizeOrigin = (value?: string) => {
    const fallback = process.env.NODE_ENV === 'production'
        ? DEFAULT_PROD_FRONTEND_ORIGIN
        : 'http://localhost:3000';

    const candidate = ensureAbsoluteUrl(value || '') || fallback;

    try {
        return new URL(candidate).origin;
    } catch {
        return candidate.replace(/\/+$/, '');
    }
};

const normalizeDomain = (value?: string) => {
    if (!value) return undefined;
    const trimmed = value.trim().replace(/^\./, '');
    return trimmed || undefined;
};

const getCookieMode = (): CookieMode => {
    const configured = (process.env.AUTH_COOKIE_MODE || 'same-site').trim().toLowerCase();
    return configured === 'cross-site' ? 'cross-site' : 'same-site';
};

const getConfiguredSameSite = (): CookieSameSite => {
    const configured = (process.env.AUTH_COOKIE_SAMESITE || '').trim().toLowerCase();
    if (configured === 'strict') return 'strict';
    if (configured === 'none') return 'none';
    if (configured === 'lax') return 'lax';
    return 'none';
};

export const getFrontendOrigin = () => normalizeOrigin(process.env.FRONTEND_URL);

export const getAllowedOrigins = () => {
    const primary = getFrontendOrigin();
    const origins = new Set([primary]);

    if (isLocalhost(primary)) {
        try {
            const url = new URL(primary);
            const port = url.port || (url.protocol === 'https:' ? '443' : '80');
            origins.add(`${url.protocol}//localhost:${port}`);
            origins.add(`${url.protocol}//127.0.0.1:${port}`);
            origins.add(`${url.protocol}//[::1]:${port}`);
        } catch {
            // ignore malformed URL
        }
    }

    return Array.from(origins);
};

export const getCookieSettings = (): AuthCookieSettings => {
    const frontendOrigin = getFrontendOrigin();
    const isLocal = isLocalhost(frontendOrigin);
    const isProd = process.env.NODE_ENV === 'production';
    const isHttps = frontendOrigin.startsWith('https://') || isProd || !!process.env.VERCEL;
    const mode = getCookieMode();
    const domain = normalizeDomain(process.env.AUTH_COOKIE_DOMAIN);

    if (isLocal) {
        return { sameSite: 'lax', secure: false, path: '/' };
    }

    if (isHttps && mode === 'cross-site') {
        return { sameSite: 'none', secure: true, domain, path: '/' };
    }

    return {
        sameSite: isHttps ? getConfiguredSameSite() : 'lax',
        secure: isHttps,
        domain,
        path: '/',
    };
};

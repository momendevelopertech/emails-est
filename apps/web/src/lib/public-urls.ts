const LOCAL_API_URL = '/api';

type NormalizeOptions = {
    allowRelative?: boolean;
};

const hasScheme = (value: string) => /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
const isLocalHost = (value: string) => /^(localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/i.test(value);
const isLocalAbsoluteUrl = (value: string) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/i.test(value);

const normalizePublicUrl = (value: string, options: NormalizeOptions = {}) => {
    const allowRelative = options.allowRelative ?? true;
    const trimmed = value.trim();
    if (!trimmed) return value;
    if (allowRelative && trimmed.startsWith('/')) return trimmed;
    if (hasScheme(trimmed)) return trimmed;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    if (isLocalHost(trimmed)) return `http://${trimmed}`;
    return `https://${trimmed}`;
};

export const getPublicApiUrl = () =>
    (() => {
        const configuredUrl = normalizePublicUrl(process.env.NEXT_PUBLIC_API_URL || LOCAL_API_URL, { allowRelative: true });
        const isBrowser = typeof window !== 'undefined';
        const isAbsoluteUrl = /^https?:\/\//i.test(configuredUrl);
        const isVercel = !!process.env.VERCEL;

        // Keep localhost browser traffic direct so local auth/CSRF uses the real API origin.
        if (isBrowser && isLocalAbsoluteUrl(configuredUrl)) {
            return configuredUrl;
        }

        // On Vercel production, always use absolute URL to the API domain
        // (rewrites don't work reliably for CSRF and auth cookies)
        if (isBrowser && isVercel && isAbsoluteUrl) {
            return configuredUrl;
        }

        // In Next.js server or if not absolute, use the configured URL as-is
        return configuredUrl;
    })();

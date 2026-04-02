import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const LOCAL_API_URL = 'http://localhost:3001/api';
const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
    'connection',
    'content-encoding',
    'content-length',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
]);

const hasScheme = (value: string) => /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
const isLocalHost = (value: string) => /^(localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/i.test(value);

const normalizeApiBase = (value?: string) => {
    const trimmed = (value || '').trim();
    const source = trimmed || LOCAL_API_URL;

    if (source.startsWith('/')) {
        return LOCAL_API_URL;
    }

    const withoutProtocolRelative = source.startsWith('//') ? `https:${source}` : source;
    const withScheme = hasScheme(withoutProtocolRelative)
        ? withoutProtocolRelative
        : isLocalHost(withoutProtocolRelative)
            ? `http://${withoutProtocolRelative}`
            : `https://${withoutProtocolRelative}`;

    return withScheme.replace(/\/$/, '').replace(/\/api$/, '');
};

const getApiOrigin = () =>
    normalizeApiBase(process.env.API_URL || process.env.NEXT_PUBLIC_API_URL);

const buildTargetUrl = (req: NextRequest, path: string[]) => {
    const target = new URL(`${getApiOrigin()}/api/${path.join('/')}`);
    target.search = req.nextUrl.search;
    return target;
};

const splitSetCookieHeader = (value: string) => {
    const cookies: string[] = [];
    let start = 0;
    let inExpires = false;

    for (let index = 0; index < value.length; index += 1) {
        const char = value[index];
        const segment = value.slice(index, index + 8).toLowerCase();

        if (segment === 'expires=') {
            inExpires = true;
            continue;
        }

        if (inExpires && char === ';') {
            inExpires = false;
            continue;
        }

        if (char === ',' && !inExpires) {
            const cookie = value.slice(start, index).trim();
            if (cookie) cookies.push(cookie);
            start = index + 1;
        }
    }

    const finalCookie = value.slice(start).trim();
    if (finalCookie) cookies.push(finalCookie);

    return cookies;
};

const getSetCookieHeaders = (headers: Headers) => {
    const withGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
    const direct = withGetSetCookie.getSetCookie?.();
    if (direct && direct.length > 0) {
        return direct;
    }

    const combined = headers.get('set-cookie');
    if (!combined) return [];
    return splitSetCookieHeader(combined);
};

const createUpstreamHeaders = (req: NextRequest) => {
    const headers = new Headers(req.headers);
    headers.delete('host');
    headers.delete('connection');
    headers.set('x-forwarded-host', req.headers.get('host') || '');
    headers.set('x-forwarded-proto', req.nextUrl.protocol.replace(':', ''));
    headers.set('x-forwarded-port', req.nextUrl.port || (req.nextUrl.protocol === 'https:' ? '443' : '80'));
    return headers;
};

const createResponse = async (upstream: Response) => {
    const body = upstream.body ? await upstream.arrayBuffer() : null;
    const headers = new Headers();

    upstream.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') return;
        if (HOP_BY_HOP_RESPONSE_HEADERS.has(key.toLowerCase())) return;
        headers.set(key, value);
    });

    const setCookies = getSetCookieHeaders(upstream.headers);
    setCookies.forEach((cookie) => {
        headers.append('set-cookie', cookie);
    });

    headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');

    return new Response(body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers,
    });
};

async function proxyRequest(req: NextRequest, context: { params: { path: string[] } }) {
    const targetUrl = buildTargetUrl(req, context.params.path || []);
    const method = req.method.toUpperCase();
    const headers = createUpstreamHeaders(req);
    const body = method === 'GET' || method === 'HEAD' ? undefined : await req.arrayBuffer();

    const upstream = await fetch(targetUrl, {
        method,
        headers,
        body,
        cache: 'no-store',
        redirect: 'manual',
    });

    return createResponse(upstream);
}

export const GET = proxyRequest;
export const HEAD = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;

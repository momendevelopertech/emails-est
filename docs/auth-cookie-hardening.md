# Authentication Cookie Hardening Guide (Next.js + NestJS)

## 1) Why Chrome shows third‑party cookie warnings

Your current setup uses `SameSite=None; Secure` for all auth cookies. That attribute combination tells the browser that the cookie is intentionally cross-site, which Chrome now treats as third-party behavior in many flows (iframes, cross-site subresource requests, tracking-like contexts).

Even when your app is a normal SPA + API split, Chrome may still warn if:
- the frontend and API are on different **sites** (different eTLD+1),
- the app is embedded in another site,
- requests happen in contexts Chrome classifies as third-party.

## 2) Best production-ready cookie configuration

Default to **same-site architecture** and use first-party cookies:
- `SameSite=Lax`
- `Secure=true` (HTTPS only)
- `HttpOnly=true` for token cookies
- explicit `Path=/`
- explicit `Domain` only when needed (`AUTH_COOKIE_DOMAIN`)

Use `SameSite=None` only when truly required (cross-site embedding, different registrable domains), and keep that behind an explicit env switch.

## 3) Security + performance improvements

Security improvements:
- Rotate refresh tokens on every refresh.
- Store only hashed refresh tokens server-side.
- Bind refresh sessions to device metadata (`ip`, `ua`) with anomaly checks.
- Add path/domain-consistent cookie clearing.
- Keep CORS allowlist strict and credentialed.
- Keep CSRF protection active for cookie-based auth.

Performance improvements:
- Keep access token short-lived (10–15m) and refresh token longer.
- Refresh only on `401`, deduplicate parallel refresh calls on client.
- Cache safe GETs only (already done in your axios layer with explicit opt-in).

## 4) Recommended Next.js ↔ NestJS auth flow

1. Frontend requests `GET /auth/csrf` to receive a CSRF token.
2. Login request posts credentials + `X-CSRF-Token`.
3. Backend sets `access_token` + `refresh_token` as `HttpOnly` cookies.
4. Frontend calls API with `withCredentials: true`.
5. On `401`, frontend calls `POST /auth/refresh`, then retries original request.
6. Logout revokes refresh session and clears cookies.

## 5) Handling login, refresh, logout

### Login
- Validate credentials.
- Create session record and issue both tokens.
- Set cookie TTL based on `remember_me`.

### Refresh
- Read refresh cookie.
- Validate against DB/session store.
- Rotate refresh token and session metadata.
- Set new access/refresh cookies atomically.

### Logout
- Revoke refresh session server-side.
- Clear all auth cookies with **same options** (domain/path/samesite/secure).

## 6) Avoiding third-party cookie deprecation issues

Prefer one of these deployment patterns:

### Pattern A (best): same-site subdomains
- `app.example.com` (Next.js)
- `api.example.com` (NestJS)
- Cookies configured for same-site (`Lax`) and optionally domain `.example.com`.

### Pattern B: reverse proxy to same origin
Serve API through Next.js domain path, e.g. `https://app.example.com/api/*` proxy to NestJS. Browser sees first-party cookies only.

### Pattern C: true cross-site (only if required)
- Keep `SameSite=None; Secure`
- Consider CHIPS (`Partitioned`) for embedded contexts where compatible.
- Expect limitations and evolving browser behavior.

## 7) CSRF hardening recommendations

- Continue using `csurf` secret cookie + request header token.
- Regenerate token frequently (e.g., on login and periodically).
- Enforce `Origin`/`Referer` checks for state-changing methods.
- Exclude only truly public, non-mutating endpoints.
- Keep CSRF secret cookie `HttpOnly`, `Secure`, aligned with domain/path.

## 8) NestJS cookie examples

Use centralized cookie settings and apply everywhere (set + clear):

```ts
const { sameSite, secure, domain, path } = getCookieSettings();

res.cookie('access_token', token, {
  httpOnly: true,
  secure,
  sameSite,
  maxAge: 15 * 60 * 1000,
  path,
  ...(domain ? { domain } : {}),
});

res.clearCookie('access_token', {
  httpOnly: true,
  secure,
  sameSite,
  path,
  ...(domain ? { domain } : {}),
});
```

## 9) Next.js authenticated API request examples

```ts
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (csrfToken) {
    config.headers = config.headers || {};
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

api.interceptors.response.use(undefined, async (error) => {
  if (error.response?.status === 401) {
    await api.post('/auth/refresh', {});
    return api(error.config);
  }
  throw error;
});
```

## 10) How large production apps solve this

Most mature apps converge on:
- first-party cookie auth wherever possible,
- centralized session/token service,
- refresh token rotation + revocation lists,
- device/session visibility in security UI,
- strict CORS + CSRF + origin checks,
- edge/API gateway routing to keep auth first-party,
- phased fallback for exceptional cross-site integrations.

## Environment variables to support both modes

- `FRONTEND_URL=https://app.example.com`
- `AUTH_COOKIE_MODE=same-site` (default) or `cross-site`
- `AUTH_COOKIE_DOMAIN=example.com` (optional)
- `AUTH_COOKIE_SAMESITE=lax` (or `strict`)

Use `cross-site` only when absolutely necessary.

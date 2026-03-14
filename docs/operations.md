# Operations and Development

## Environment Setup

1. Copy `.env.example` to `.env`.
2. Provide database, Redis, Cloudinary, email, and WhatsApp credentials.
3. Set `FRONTEND_URL` and public API settings for the web app.

Critical environment variables are documented in `DEPLOYMENT.md`.

## Local Development

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:3001/api`
- Swagger (dev): `http://localhost:3001/api/docs`

## Deployment Process

- Frontend: deploy `apps/web` to Vercel.
- Backend: deploy `apps/api` to Render/Railway/Fly.io/VM.
- Use HTTPS in production and enable secure cookies.

## Development Guidelines

- Keep controllers thin; put business logic in services.
- Prefer DTOs for validation and consistent inputs.
- Use `AuditService` for security-sensitive operations.
- Use i18n messages from `messages/en.json` and `messages/ar.json`.
- Avoid hard-coded text in UI and services.

## Error Handling Strategy

- API uses `HttpExceptionFilter` for consistent JSON errors.
- Frontend wraps API errors in `AppApiError` to standardize messages.
- Always prefer structured errors over raw strings.

## Security Considerations

- Cookie auth with CSRF protection is required for mutating requests.
- RBAC is enforced via `RolesGuard`.
- Use `AUTH_COOKIE_MODE`, `AUTH_COOKIE_DOMAIN`, and `AUTH_COOKIE_SAMESITE` to align with deployment.
- Set `REFRESH_TOKEN_SECRET` to a strong random value to hash refresh tokens at rest.
- Refresh sessions are bound to IP and user-agent; changes will require re-login.
- Rotate secrets regularly and keep them out of git.
- Rate limits are controlled through Nest Throttler.
- Report endpoints can be cached with `REPORTS_CACHE_TTL` (seconds).

For deeper guidance, see `docs/auth-cookie-hardening.md`.

# Performance & Security Improvement Plan

Last updated: 2026-03-14
Owner: Engineering
Scope: Web app + API + infra practices

**Goals**
1. Make navigation and tab switching feel instant, even with large datasets.
2. Reduce unnecessary network and rendering work while keeping data fresh.
3. Harden production security posture with explicit configuration and safe defaults.
4. Create a sustainable maintenance loop for performance and security.

**Recent Improvements Already Landed**
1. App shell is now persistent via route grouping to avoid re-mounts on navigation.
2. Background polling now pauses when the browser tab is hidden.
3. Requests and Reports tabs optimized with precomputed search keys, cached sorting, and transition-based tab switching.
4. CORS headers aligned with custom client headers.
5. Production env validation added for critical security secrets.

**Phase 1: Immediate (0-2 days)**
1. Create a shared hook for live refresh that combines Pusher updates, interval polling, and visibility checks.
2. Add a unified endpoint for notification + chat counts to avoid double fetch on every event.
3. Add simple UI-level prefetching for common routes and hot tabs.
4. Confirm throttler TTL units and adjust configuration if currently over-scaled.
5. Enforce Cloudinary folder allowlist on signed upload URL endpoint.

**Phase 2: Short-Term (1-2 weeks)**
1. Implement server-side pagination for high-volume list endpoints used by Requests and Reports.
2. Add table virtualization for large lists to reduce DOM load.
3. Add caching headers or ETag support for read-heavy endpoints with stable data.
4. Introduce TanStack Query for data-heavy pages with proper stale time and refetch rules.
5. Add task-level throttling for sensitive endpoints (login, reset, uploads) beyond global limits.

**Phase 3: Mid-Term (3-6 weeks)**
1. Add database indexes aligned with frequently filtered fields (date ranges, status, governorate, department).
2. Add query profiling and slow query logging for Prisma in non-prod.
3. Add server-side aggregation endpoints for summary cards to reduce client computation.
4. Replace client-side export URL generation with signed export links to reduce leakage risk.
5. Add content security policy and tighten helmet configuration as needed.

**Security Hardening Checklist**
1. Ensure these env variables are required in production: JWT keys, CSRF secret, refresh token secret.
2. Rotate secrets and enforce minimum length and format validation in deployment scripts.
3. Limit CSRF skip paths to the smallest possible set and document exceptions.
4. Validate all upload targets and content types on the server.
5. Add audit log coverage for all privileged actions and report exports.

**Performance Checklist**
1. Avoid repeated parsing and formatting in render loops.
2. Cache or precompute search keys for large lists.
3. Use deferred state and transitions for heavy UI updates.
4. Prefer server-side pagination and filtering to avoid full list transfers.
5. Use visibility-based polling control for background refresh.

**Observability & Quality**
1. Add client performance markers for page load and tab switch duration.
2. Add API metrics for p95 response times of top endpoints.
3. Add CI checks for linting, type checking, and security audit output.
4. Add performance budget checks for bundle size growth.

**Risks & Mitigations**
1. Pagination changes may alter UX expectations.
2. Virtualization can break table scrolling and print behaviors.
3. Cache headers may expose stale data if invalidation is incomplete.
4. Security tightening may break deployments if secrets are missing.

**Acceptance Criteria**
1. Tab switching stays responsive with 5k+ rows in Requests and Reports.
2. P95 API response time for list endpoints below 400 ms in staging.
3. No production deployment proceeds with missing critical secrets.
4. Background refresh does not run when the tab is not visible.
5. Count endpoints return in a single request for nav badges.

# Messaging-only Audit (Pre-refactor)

## Directly used in messaging flow
- Web messaging routes under `apps/web/src/app/[locale]/(app)/messaging/**`.
- Web messaging components under `apps/web/src/components/messaging/**`.
- API messaging module under `apps/api/src/messaging/**`.
- Delivery services: `apps/api/src/notifications/email.service.ts` and `apps/api/src/notifications/whatsapp.service.ts`.
- Minimal auth: `apps/api/src/auth/**` and web auth helpers (`use-auth`, `auth-store`).

## Legacy / removable areas
- HR modules (requests/forms/departments/reports/chat/employees/settings/notes/lateness/etc.).
- Notifications center + pusher real-time notifications.
- Registration workflows and organization structures (branches/departments).

## Deletion risks
- Hard dropping tables can remove production history and approvals data.
- Existing users relying on self-registration/branch-department profile fields will lose those flows.
- Any external automation calling removed routes will fail unless redirected/updated.

## Mitigation
- This change keeps auth login/refresh/me for session protection.
- Migration is explicit and destructive; backup-first rollout is required.
- README includes rollback guidance.

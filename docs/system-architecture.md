# System Architecture

## Overview

SPHINX HR is a monorepo with a Next.js 14 frontend (`apps/web`) and a NestJS API (`apps/api`). The backend uses Prisma with PostgreSQL as the primary datastore, Redis for caching, Pusher for real-time updates, and Cloudinary for file uploads. The frontend is multilingual (Arabic RTL and English LTR) and uses cookie-based authentication with CSRF protection.

## Architecture Pattern

- Backend: Modular, layered NestJS architecture (controllers → services → Prisma data access).
- Frontend: Next.js App Router with page-level routing and client components for interactive screens.
- Cross-cutting concerns: centralized error handling, RBAC, audit logging, notifications, and caching.

## High-Level Data Flow

Browser
→ Next.js (UI, i18n, API client)
→ NestJS API (`/api`)
→ PostgreSQL (core data)
→ Redis (cache)
→ Pusher (realtime)
→ Cloudinary (uploads)

## Backend Modules and Responsibilities

- `auth`: Login, refresh, logout, password reset, CSRF token issuance.
- `users`: User CRUD, stats, history, leave balance updates, deactivation.
- `departments`: Department CRUD and branch linkage.
- `branches`: Branch listing for filtering and assignment.
- `leaves`: Leave requests and balances, workflow approvals.
- `permissions`: Permission requests and cycle tracking.
- `forms`: Dynamic form builder and submissions workflow.
- `notifications`: In-app notifications and broadcast events.
- `chat`: Internal messaging and unread counts.
- `reports`: Aggregated reports and Excel exports.
- `settings`: Work schedule settings and global data reset.
- `lateness`: Lateness entries and conversion to permissions.
- `notes`: Personal notes attached to employees.
- `audit`: Security and activity logs.
- `pdf`: PDF rendering for request records.
- `cloudinary`: File uploads and media handling.
- `redis`: Cache access and helpers.

## Frontend Areas

- `app/[locale]`: Page routes (dashboard, requests, employees, departments, forms, reports, settings, notifications, chat).
- `components`: Feature clients and shared UI blocks.
- `lib`: API client, auth helpers, search normalization, Pusher hooks.
- `messages`: i18n strings for Arabic and English.

## Core Workflows

### Authentication

1. Client requests `GET /auth/csrf`.
2. Client sends credentials to `POST /auth/login`.
3. API sets `access_token` and `refresh_token` HttpOnly cookies.
4. Client uses cookies for authenticated calls.
5. On `401`, client calls `POST /auth/refresh` and retries.

### Leave and Permission Requests

1. Employee submits request.
2. Secretary verifies.
3. Manager approves.
4. HR finalizes.
5. Notifications and audit logs are generated at each step.

### Notifications

- Server creates in-app notifications per event.
- Pusher sends realtime updates to relevant users.

### Reports

- API computes filtered datasets.
- Excel exports generated server-side.


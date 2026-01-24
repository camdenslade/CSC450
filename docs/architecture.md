# TabUp Architecture

## System overview
- Mobile app (Expo/React Native) is the primary client. It authenticates with Firebase Auth (email/phone, custom UI) and calls a REST API.
- Backend will be a Nest.js service running on AWS EC2 behind NGINX. Data is stored in Postgres via TypeORM. Binary assets (receipt photos, profile avatars) live in S3 with pre-signed URLs.
- Notifications: push (APNs/FCM via Expo or native modules) when both users have the app; SMS fallback via Twilio for reminders and invites.
- Secrets (DB creds, JWT keys, Twilio tokens, S3 keys) managed in AWS Secrets Manager and injected at runtime.

## Codebase layout (logical)
- `apps/mobile` — client UI + future API hooks. Shared UI primitives in `src/shared`; theming in `src/theme`.
- `apps/api` — Nest.js service (to be scaffolded) with modules: auth, users, friends, bills/tabs, groups, ledger, notifications, uploads.
- `packages/shared-types` — DTOs and response contracts consumed by both mobile and API.
- `infrastructure` — IaC placeholders for EC2, NGINX, S3, and security (SGs, bucket policy).

## Core flows
- **Start a tab**: user captures bill (camera/upload), enters totals, selects friends, chooses payout platform per friend, sets even/custom split → API persists tab, items, participants, and requested amounts; returns share links and notification schedule.
- **Remind/settle**: backend sends push/SMS reminders; status updates feed the ledger and home activity list.
- **Ledger/history**: read-only timeline of tabs, with per-user balances and group rollups.

## Data model sketch (API-side)
- Users: id, auth_provider_uid, display_name, avatar_url, phone_hash, email_hash, default_platform.
- Friends: user_id, friend_user_id, status (invited/accepted/blocked), source (contacts/imported/manual).
- Tabs/Bills: id, owner_id, location, total_amount, tax, tip, created_at, status (open/settled/cancelled).
- TabParticipants: tab_id, user_id (or external contact), platform, share_amount, paid_amount, state, reminders_sent.
- LedgerEntries: tab_id, user_id, delta (+owed / -owes), settled_at.
- Uploads: id, tab_id, s3_key, mime_type, size, created_at.

## Runtime architecture
- NGINX terminates TLS and routes `/api/*` to the Nest.js app. Static asset requests (if any) can be served via S3/CloudFront.
- Nest.js layers: controller → service → repository (TypeORM) → Postgres. Domain events can enqueue notifications jobs (future: queue like SQS).
- Mobile app talks to API over HTTPS and S3 directly for uploads/downloads using pre-signed URLs.

## Environments
- Local: Expo dev server + mocked API or localhost Nest.js with Dockerized Postgres.
- Dev/staging: single EC2 instance, managed Postgres (RDS), Twilio sandbox numbers, test Firebase project, dev S3 bucket with restrictive CORS.
- Prod: autoscaled API (later), RDS with backups, prod Firebase project, prod S3 bucket with lifecycle rules, NGINX WAF ruleset.

## Observability (planned)
- Request logging with structured JSON (Nest.js interceptors).
- Basic metrics: request latency, error rate, notification success, S3 upload failures.
- Alerting on auth errors, push/SMS failure spikes, DB error rate.

## Frontend architectural notes
- Keep screens small and compose from shared components (`Layout`, `NavBar`, `Section`, etc.).
- State management: start simple with React hooks; introduce a lightweight query/client (e.g., tanstack/query) once API endpoints exist.
- Navigation: NavBar currently stubbed; adopt React Navigation when multi-screen flows are implemented.

## Backend architectural notes
- Modular Nest.js: each domain (auth, friends, tabs, groups, ledger, notifications, uploads) as a module with DTOs exported to `packages/shared-types`.
- Validation via `class-validator` pipes; global exception filter for consistent API errors.
- Security: JWT or Firebase ID token verification middleware; per-resource authorization checks in guards.
- File uploads: presign + S3 direct upload; store metadata only; validate mime/size before presign.

## Dependencies and boundaries
- Mobile consumes only `/api` and S3 presigned URLs; it should never see raw secrets.
- Backend depends on AWS (S3, Secrets Manager), Twilio, Firebase; keep provider adapters isolated behind interfaces for swap/black-box testing.

## Known gaps (Jan 22, 2026)
- API not yet scaffolded; no CI/CD, no infra automation, no real data wiring in the mobile app.
- Navigation, auth session handling, and error states are not implemented in the client.

# TabUp Architecture

## System overview
- Mobile app (Expo/React Native) authenticates with Firebase Auth and calls a NestJS REST API.
- API runs in a Docker container on a single EC2 instance. Data is stored in Postgres (self-hosted on the same EC2). Binary assets (receipts, avatars) go to S3 with pre-signed URLs.
- TabUp never handles money. The API generates deep links (PayPal, Venmo, CashApp) that route payments directly between users.
- Secrets managed in AWS Secrets Manager as a single JSON blob named `tabup`.

## Codebase layout
```
apps/mobile/        - Expo/React Native client
apps/api/           - NestJS API (active, deployed)
packages/shared-types/  - Cross-package TypeScript types (stub)
infrastructure/     - IaC placeholders
docs/               - This documentation
scripts/            - Deploy, migrate, restart scripts
```

## Backend module structure
```
apps/api/src/
  main.ts                  - Bootstrap: Helmet, ValidationPipe, CORS, global guard
  app.module.ts            - Root module
  app.controller.ts        - GET /api/status (public health check)
  common/
    base.entity.ts         - UUID PK, createdAt, updatedAt
    enums.ts               - Platform, FriendStatus, BillStatus, ParticipantState, etc.
    filters/               - GlobalExceptionFilter
    interceptors/          - LoggingInterceptor
    guards/                - FirebaseAuthGuard (global), ownership helpers
    decorators/            - @Public(), @CurrentUser()
  database/
    data-source.ts         - TypeORM CLI data source (migrations)
    typeorm.config.ts      - Async factory pulling secrets at runtime
    migrations/            - 001-005 (all applied)
  secrets/                 - SecretsService: lazy-loads JSON blob from Secrets Manager
  auth/                    - POST /api/v1/auth/exchange (Firebase token -> user record)
  users/                   - Profile CRUD, device registration
  payments/                - Handle management + PayPal/Venmo/CashApp link generation
  friends/                 - Friend requests via hashed phone/email lookup
  bills/                   - Tab creation, splits, settle, cancel
  ledger/                  - Paginated ledger history
  groups/                  - Group creation and membership
  uploads/                 - S3 presign for receipt/avatar uploads
  notifications/           - Stub (push + Twilio SMS planned)
```

## Data model
- **users**: id, auth_provider_uid, display_name, avatar_s3_key, phone_hash, email_hash, default_platform, push_token, push_platform
- **payment_handles**: user_id, platform, handle, verified_at
- **friends**: requester_id, recipient_id, status, source
- **bills**: owner_id, name, location, total_cents, tax_cents, tip_cents, currency, notes, receipt_s3_key, status
- **bill_participants**: bill_id, user_id (nullable), contact_name, contact_phone_hash, platform, share_cents, paid_cents, state, payment_link, reminders_sent, settled_at
- **ledger_entries**: user_id, bill_id, delta_cents, settled_at
- **groups**: owner_id, name, avatar_s3_key
- **group_members**: group_id, user_id, joined_at

All monetary values stored in cents (integer). Phone/email hashed with HMAC-SHA256 + Secrets Manager salt.

## Runtime architecture
- EC2 instance (t-series, Ubuntu) running Docker.
- `tabup-api` container: NestJS on port 3000, exposed directly (no NGINX).
- Postgres running natively on the same EC2 host; container reaches it via `172.17.0.1` (Docker bridge gateway).
- S3 for binary assets; pre-signed PUT URLs generated server-side, client uploads directly.
- AWS Secrets Manager (single JSON blob `tabup`) provides all runtime secrets.
- EC2 IAM role (`tabup-ec2-role`) grants read access to Secrets Manager and ECR.

## Security hardening
- Helmet: CSP, noSniff, frameguard, hidePoweredBy, HSTS (prod), referrerPolicy
- @nestjs/throttler: 100 req/min global, 10 req/min on /auth/exchange
- ValidationPipe: whitelist + forbidNonWhitelisted + transform
- Firebase token verification with checkRevoked=true
- FirebaseAuthGuard applied globally; @Public() skips it
- No raw PII stored (phone/email hashed); no PII in logs
- Handle format validated before URL construction (SSRF prevention)
- Memo sanitized before embedding in payment URLs
- TypeORM parameterized queries
- SSL required for DB in production (rejectUnauthorized: false for self-signed cert)

## Payment link formats
- PayPal: `https://paypal.me/{handle}/{amount_in_dollars}`
- Venmo: `venmo://paycharge?txn=pay&recipients={handle}&amount={amount}&note={note}` (web fallback via venmo.com)
- CashApp: `https://cash.app/%24{handle}/{amount_in_dollars}`

## Deployment
- Source synced to EC2 via tar over SSH (`scripts/deploy-backend.sh`) - no local Docker required.
- Image built on EC2, container restarted in place.
- Migrations run via `scripts/migrate.sh` (or `--migrate` flag on deploy).
- Restart without rebuild: `scripts/restart.sh`.

## Planned / not yet implemented
- NGINX / TLS termination (currently HTTP only on port 3000)
- Push notifications (APNs/FCM via Expo)
- Twilio SMS reminders
- CI/CD pipeline
- Multi-instance / auto-scaling
- Mobile API integration (currently mock data)

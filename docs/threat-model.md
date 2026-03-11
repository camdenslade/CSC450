# TabUp Threat Model

Scope: mobile app (Expo/React Native), NestJS API (EC2/Docker), Postgres (EC2), S3, AWS Secrets Manager, Firebase Auth.

## Assets
- PII: display names, avatars. Phone/email hashed before storage and never persisted in plaintext.
- Auth tokens: Firebase ID tokens (short-lived, checked for revocation).
- Tab data: bill amounts, locations, participant lists, payment platform handles.
- Media: receipt images and avatars in S3.
- Secrets: DB creds, Firebase service account, S3 bucket, phone hash salt - all in Secrets Manager.

## Actors & entry points
- Users via mobile app over HTTP (HTTPS planned).
- Backend admins via SSH to EC2.
- Third-party providers: Firebase, AWS, payment platforms.
- Adversaries: network eavesdroppers (currently mitigated only at DB level), stolen devices, malicious participants, spam bots.

## Threats & mitigations (STRIDE)

**Spoofing / Auth**
- Firebase ID tokens verified on every request with `checkRevoked: true`.
- FirebaseAuthGuard applied globally; only explicitly `@Public()` routes bypass it.
- No long-lived API tokens issued.

**Tampering**
- Helmet: CSP, noSniff, frameguard, HSTS (in production), referrerPolicy.
- ValidationPipe: whitelist + forbidNonWhitelisted on all request bodies.
- Phone/email hashed with HMAC-SHA256 + per-deployment salt (Secrets Manager); raw values never stored or logged.
- Server-side share validation: participant shares must sum to bill total.
- Payment handle format validated before URL construction (SSRF prevention).
- Memo sanitized before embedding in payment URLs.

**Repudiation**
- Structured request logging with `requestId` on every request and error response.
- `createdAt` / `updatedAt` on all entities.

**Information disclosure**
- Resource access scoped to owner or registered participant via `assertOwner()` guards.
- S3 objects accessed only via short-lived presigned URLs generated server-side.
- No raw PII in logs or error responses.
- DB SSL enabled (`rejectUnauthorized: false` for self-signed cert).

**Denial of service**
- @nestjs/throttler: 100 req/min global, 10 req/min on auth/exchange.
- Upload size capped at 10 MB; MIME type allowlist enforced before presign.

**Elevation of privilege**
- Owner-only mutations (settle, split, cancel) enforced server-side.
- EC2 IAM role scoped to read-only Secrets Manager access - no ability to write/delete secrets.
- TypeORM parameterized queries prevent SQL injection.

## Abuse cases
- **Notification spam**: per-user invite quotas planned; SMS opt-out needed before Twilio goes live.
- **Phishing via payment links**: links generated server-side with validated handles only; no user-supplied URLs.
- **Receipt upload malware**: MIME type allowlist + size cap enforced; EXIF stripping and AV scanning planned.

## Data protection
- At rest: Postgres on EC2 (no RDS encryption at this tier); S3 SSE; Secrets Manager encrypted by default.
- In transit: DB uses SSL; API currently HTTP only (TLS termination via NGINX/ALB planned).
- Secrets: single JSON blob in Secrets Manager; EC2 IAM role grants read-only access; never in code or env files.

## Current gaps (March 2026)
- No TLS on the API (HTTP only on port 3000) - NGINX or ALB with ACM cert needed before production traffic.
- No push notifications or SMS yet.
- Mobile app uses mock data and has no API integration yet.
- No CI/CD pipeline.
- No automated backups for self-hosted Postgres.
- No monitoring/alerting (auth failures, error rate spikes).
- No session revocation flow on the mobile client.

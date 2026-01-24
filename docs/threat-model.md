# TabUp Threat Model (draft)

Scope covers the mobile app, planned Nest.js API, AWS resources (EC2, RDS/Postgres, S3, Secrets Manager), Twilio SMS, and Firebase Auth.

## Assets
- PII: phone numbers, emails, display names, avatars.
- Auth tokens: Firebase ID tokens, API JWTs, refresh tokens.
- Tab data: bill amounts, locations, participant lists, payment platform preferences.
- Media: receipt images and profile images in S3.
- Secrets: DB creds, JWT keys, Twilio tokens, S3 keys.

## Actors & entry points
- Users via mobile app over HTTPS.
- Backend admins via SSH/console.
- Third-party providers: Firebase, Twilio, AWS.
- Adversaries: network eavesdroppers, stolen devices, malicious invitees, spam bots, and compromised admin accounts.

## Threats & mitigations (STRIDE-lite)
- **Spoofing / Auth**: Use Firebase Auth; validate ID tokens/JWT on every request; short-lived tokens with refresh; device binding optional for push tokens.
- **Tampering**: All traffic over TLS; HSTS at NGINX; request validation (`class-validator`) and strict content-type. Hash phone/email before storage; never store raw secrets in code or client.
- **Repudiation**: Structured request logging with requestId; keep audit fields (createdBy/updatedBy) on tabs and ledger entries.
- **Information disclosure**: Scope data to owner/participant via authorization guards; avoid exposing contact info of others; pre-signed URLs short-lived and purpose-scoped; S3 buckets private with least-privilege IAM.
- **Denial of service**: Rate-limit auth, invites, and uploads at NGINX/app; size limits on uploads; graceful fallbacks on provider outages (queue retries with backoff).
- **Elevation of privilege**: Role-based checks (owner vs participant); server-side enforcement of tab mutations; do not trust client-calculated shares.

## Abuse cases
- **Invite/notification spam**: per-user/day invite quotas, captcha or proof-of-work on unauth’d flows, opt-out for SMS, blocklist handling.
- **Phishing via links**: Only generate signed deep links with expiry; show sender name in the link landing screen.
- **Receipt upload malware**: Accept only images; strip EXIF; content-length caps; consider AV scanning/Lambda in future.

## Data protection
- At rest: RDS encryption, S3 SSE, Secrets Manager for secrets. Hash (bcrypt/argon2) phone/email for lookup; avoid logging raw PII.
- In transit: TLS 1.2+, pinned domains, no HTTP downgrade.

## Device loss
- Encourage OS-level biometrics on app entry; allow remote session revocation; avoid long-lived refresh tokens on device if not needed.

## Operations
- Principle of least privilege IAM roles for API, workers, and CI.
- Backups for Postgres with tested restore; S3 lifecycle rules to reduce blast radius.
- Monitoring/alerts on auth failures, push/SMS failure spikes, and anomalous invite rates.

## Current gaps (Jan 22, 2026)
- No server implementation yet → token verification, rate limiting, logging, and audit trails are not in place.
- No CI/CD or secrets wiring; infra folders are placeholders.
- Mobile app lacks session persistence, logout, and error handling flows.

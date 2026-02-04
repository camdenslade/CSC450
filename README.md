# TabUp

## What TabUp is
- A friend-first bill-splitting experience that captures receipts, lets people choose a preferred payout platform, and nudges them to settle without ever touching the funds ourselves.
- The mobile shell focuses on the landing/home experience; the backend pieces noted in `docs/` are placeholders that will eventually power auth, tab history, and notification delivery.

## Technical stack
- React Native/Expo mobile client (uses shared components in `apps/mobile/src/shared`).
- Nest.js API scaffold (outlined in `docs/architecture.md`) with TypeScript, TypeORM, and Postgres.
- AWS services: EC2 hosts the API behind an NGINX proxy, S3 stores receipts + avatars via presigned URLs, Secrets Manager keeps creds secure, and security groups + bucket policies limit exposure.
- Notifications: Firebase Auth for identity, push via APNs/FCM when both users have the app, Twilio SMS as the fallback reminder channel.
- Ancillary packages: Jest for future tests, shared DTOs in `packages/shared-types`, and planned infra in `infrastructure/`.

## User flows & features
- Build a tab by photographing the bill (OCR) or entering amounts manually, choose friends, and select a payout platform per person via the logo dropdown.
- Offer even-split and custom-split modes (slider or text input) while keeping totals validated and sanitized before they hit the backend.
- Present a ledger of past tabs with per-person splits, favorites, and search through friends imported from contacts plus Venmo/PayPal-style friend requests.
- Provide group creation, preferred platform toggles, and profile metadata (avatar stored in S3, contact captured on signup) so the future API can match notifications to the right channel.
- Optional location use (with consent) to capture the restaurant where each transaction happened and surface that in the history.

## Security, validation, and infra
- Hash sensitive personally identifiable information (phone numbers, email) before persistence.
- Enforce input validation on every form field, sanitize data entering the backend, and persist login state so sessions survive app restarts.
- Configure bucket policies, EC2/NGINX security groups, and Secrets Manager to avoid leaking keys while still allowing direct S3 uploads via presigned URLs.

## Research & optional ideas
- Figure out how to request funds across every supported payout service without ever handling the money directly; this research informs the notification/settlement workflow.
- Add a global+per-user restaurant directory with reviews to complement bill splitting (community page) if more feature room appears.
- Explore year-in-spending or distribution graphs per person for insights on shared expenses.

## Visual palette
- #a0eec0
- #8ae9c1
- #86cd82
- #72a276
- #666b6a
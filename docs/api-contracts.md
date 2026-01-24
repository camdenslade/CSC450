# TabUp API Contracts (draft)

These contracts reflect the planned Nest.js REST API. All routes prefixed with `/api/v1`. Auth assumed via Firebase ID token (OIDC) or JWT; include `Authorization: Bearer <token>` unless noted.

## Conventions
- Requests/Responses are JSON unless noted.
- Timestamps in ISO 8601 UTC.
- Money in cents (integers) to avoid float issues.
- Error shape:
  ```json
  { "error": "string-code", "message": "human-friendly", "requestId": "uuid" }
  ```

## Auth
- **POST /auth/exchange** — Exchange Firebase ID token for API session JWT (optional step if backend issues its own JWT).
  - Body: `{ "idToken": "string" }`
  - 200: `{ "token": "jwt", "expiresIn": 3600 }`

## Users
- **GET /users/me** — Returns profile.
  - 200: `{ "id": "uuid", "displayName": "Cam", "avatarUrl": "https://...", "phone": "+1***", "email": "c***@example.com", "defaultPlatform": "venmo" }`
- **PATCH /users/me** — Update profile fields.
  - Body (any subset): `{ "displayName": "string", "avatarUrl": "string", "defaultPlatform": "venmo|cashapp|paypal|zelle" }`
  - 200: updated user.
- **POST /users/device** — Register device push token.
  - Body: `{ "pushToken": "expo|apns|fcm", "platform": "ios|android|web" }`

## Friends
- **GET /friends** — List friends with status.
  - 200: `[ { "id": "uuid", "displayName": "Priya", "status": "accepted", "platform": "venmo" } ]`
- **POST /friends/invite** — Invite by phone/email/contact id.
  - Body: `{ "target": "phone|email", "value": "string" }`
- **POST /friends/accept** — Accept inbound invite.
  - Body: `{ "friendId": "uuid" }`

## Tabs/Bills
- **POST /tabs** — Create a tab.
  - Body:
    ```json
    {
      "name": "Birthday dinner",
      "location": "Blue Harbor",
      "total": 12000,
      "tip": 1800,
      "tax": 900,
      "currency": "USD",
      "participants": [
        { "userId": "uuid", "platform": "venmo", "share": 4000 },
        { "contact": { "name": "Alex", "phone": "+1..." }, "platform": "cashapp", "share": 4000 }
      ],
      "notes": "Split appetisers evenly"
    }
    ```
  - 201: `{ "id": "uuid", "status": "open" }`
- **GET /tabs/{id}** — Fetch tab with participants and running status.
- **POST /tabs/{id}/split** — Update split (even/custom) or totals.
- **POST /tabs/{id}/remind** — Trigger reminders to outstanding participants.
- **POST /tabs/{id}/settle** — Mark participant as paid / tab as settled.
- **DELETE /tabs/{id}** — Cancel an open tab (owner only).

## Ledger & activity
- **GET /ledger** — Paginated history of tabs and balance deltas for the caller.
  - Query: `?cursor=<token>&limit=20`
  - 200: `{ "items": [ { "tabId": "uuid", "label": "Rooftop Drinks", "delta": -1800, "settled": true, "createdAt": "..." } ], "nextCursor": "..." }`
- **GET /activity** — Recent events (invites, reminders, settlements) for home feed.

## Groups (future)
- **POST /groups** — Create group with members.
- **GET /groups/{id}** — Details + default split rules.

## Notifications
- **POST /notifications/test** — Send a test push to the caller’s registered device (dev/stage only).

## Uploads
- **POST /uploads/presign** — Get pre-signed S3 URL for a receipt or avatar.
  - Body: `{ "purpose": "receipt|avatar", "mime": "image/jpeg", "size": 500000 }`
  - 200: `{ "uploadUrl": "https://s3...", "fileUrl": "https://cdn..." }`

## Error codes (non-exhaustive)
- `unauthorized`, `forbidden`, `validation_failed`, `not_found`, `duplicate_invite`, `unsupported_mime`, `limit_exceeded`.

## Versioning
- Prefix with `/api/v1`. Breaking changes bump the version; clients should send `X-Client-Version` for telemetry and gradual rollout.

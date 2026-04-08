# TabUp API Directory

Base URL: `http://3.80.28.75:3000` (production EC2, HTTP only for now)

All routes are prefixed with `/api`. Authenticated routes require:
```
Authorization: Bearer <firebase_id_token>
```

Money values are always integers in cents (e.g., `4000` = $40.00). Timestamps are ISO 8601 UTC.

## Error shape
```json
{ "error": "string-code", "message": "human-friendly", "requestId": "uuid" }
```
Common codes: `unauthorized`, `forbidden`, `not_found`, `validation_failed`, `conflict`, `rate_limited`.

---

## Health

### GET /api/status  (public)
```json
{ "status": "ok" }
```

---

## Auth

### POST /api/v1/auth/exchange  (public)
Exchange a Firebase ID token for the user's TabUp profile. Creates the user on first login.

**Request**
```json
{ "idToken": "firebase_id_token_string" }
```
**Response 200**
```json
{ "userId": "uuid", "displayName": "Cam" }
```
Rate limit: 10 req/min per IP.

---

## Users

### GET /api/v1/users/me
```json
{
  "id": "uuid",
  "displayName": "Cam",
  "avatarS3Key": "uploads/...",
  "defaultPlatform": "venmo",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

### PATCH /api/v1/users/me
All fields optional.
```json
{ "displayName": "string", "defaultPlatform": "paypal|venmo|cashapp" }
```

### POST /api/v1/users/device
Register or replace a push token. Returns 204.
```json
{ "pushToken": "expo_token_string", "platform": "ios|android|web" }
```

---

## Payments

TabUp never processes money. These endpoints manage handles and generate deep links.

### GET /api/v1/payments/handles
```json
[
  { "id": "uuid", "platform": "venmo",   "handle": "john-doe", "verifiedAt": null },
  { "id": "uuid", "platform": "cashapp", "handle": "johndoe",  "verifiedAt": null }
]
```

### POST /api/v1/payments/handles
Validates handle format before storing.
```json
{ "platform": "paypal|venmo|cashapp", "handle": "your-handle" }
```
Format rules:
- PayPal: letters, numbers, `.`, `-`, `_`; max 40 chars
- Venmo: letters, numbers, `.`, `-`, `_`; max 30 chars
- CashApp: letters and numbers only; max 20 chars (stored without `$`)

### DELETE /api/v1/payments/handles/:platform
Returns 204.

### POST /api/v1/payments/link
Generate a payment deep link.
```json
{ "payeeUserId": "uuid", "platform": "paypal|venmo|cashapp", "amountCents": 4000, "note": "Birthday dinner" }
```
**Response 200**
```json
{ "platform": "venmo", "paymentUrl": "venmo://paycharge?...", "webFallback": "https://venmo.com/..." }
```

---

## Friends

### GET /api/v1/friends
List accepted friends.

### GET /api/v1/friends/requests
List pending inbound friend requests (caller is recipient).

### POST /api/v1/friends/invite
Send a friend request by phone or email. The raw value is hashed on arrival and never stored.
```json
{ "target": "phone|email", "value": "+15551234567" }
```

### POST /api/v1/friends/accept
```json
{ "friendId": "uuid" }
```

### DELETE /api/v1/friends/:id
Remove or reject. Returns 204.

---

## Tabs (Bills)

### GET /api/v1/tabs
List all tabs where the caller is owner or participant, newest first.

### POST /api/v1/tabs
Create a tab. Participant shares must sum to `total`. Payment links generated at creation time if owner has a handle.
```json
{
  "name": "Birthday dinner",
  "location": "Blue Harbor",
  "total": 12000,
  "tax": 900,
  "tip": 1800,
  "currency": "USD",
  "notes": "Split apps evenly",
  "participants": [
    { "userId": "uuid", "platform": "venmo", "share": 4000 },
    { "contact": { "name": "Alex", "phone": "+1..." }, "platform": "cashapp", "share": 4000 }
  ]
}
```
**Response 201**
```json
{ "id": "uuid", "status": "open" }
```

### GET /api/v1/tabs/:id
Fetch tab with participants. Owner or registered participant only.

### POST /api/v1/tabs/:id/split
Update shares (owner only, open tabs only). Shares must still sum to original total.
```json
{ "splits": [{ "participantId": "uuid", "share": 6000 }] }
```

### POST /api/v1/tabs/:id/settle
Mark a participant as paid (owner only). Tab auto-settles when all participants are paid.
```json
{ "participantId": "uuid" }
```

### DELETE /api/v1/tabs/:id
Cancel an open tab (owner only). Returns 204.

---

## Ledger

### GET /api/v1/ledger
Paginated ledger history for the authenticated user.

Query params: `cursor` (ISO timestamp from previous `nextCursor`), `limit` (default 20, max 100).

```json
{
  "items": [
    { "tabId": "uuid", "delta": -4000, "settled": false, "createdAt": "..." }
  ],
  "nextCursor": "2026-01-01T00:00:00.000Z"
}
```
Positive `delta` = user is owed. Negative = user owes.

---

## Groups

### POST /api/v1/groups
Creator is added as a member automatically.
```json
{ "name": "Roommates", "memberIds": ["uuid", "uuid"] }
```

### GET /api/v1/groups/:id
Members only.

---

## Uploads

### POST /api/v1/uploads/presign
Get a presigned S3 PUT URL. Upload directly from the client, then pass the returned `key`
to the relevant endpoint (e.g., PATCH /users/me or POST /tabs).
```json
{ "purpose": "receipt|avatar", "mime": "image/jpeg|image/png|image/webp", "size": 512000 }
```
**Response 200**
```json
{ "uploadUrl": "https://s3.amazonaws.com/...", "key": "uploads/..." }
```
Allowed types: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`. Max: 10 MB.

---

## Rate limits

| Route                   | Limit       |
|-------------------------|-------------|
| POST /api/v1/auth/exchange | 10 req/min |
| All other routes        | 100 req/min |

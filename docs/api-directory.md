# TabUp API Directory

All routes are prefixed with `/api/v1`. Authentication is via Firebase ID token unless a route
is marked public. Include `Authorization: Bearer <firebase_id_token>` on every authenticated request.

Money values are always integers in cents (e.g., `4000` = $40.00). Timestamps are ISO 8601 UTC.

## Error shape

```json
{ "error": "string-code", "message": "human-friendly", "requestId": "uuid" }
```

Common error codes: `unauthorized`, `forbidden`, `not_found`, `validation_failed`, `conflict`, `rate_limited`.

---

## Auth

### POST /api/v1/auth/exchange  (public)
Exchange a Firebase ID token for the user's TabUp profile. Creates the user record on first login.

**Request body**
```json
{ "idToken": "firebase_id_token_string" }
```

**Response 200**
```json
{ "userId": "uuid", "displayName": "Cam" }
```

Rate limit: 10 requests per minute per IP.

---

## Users

### GET /api/v1/users/me
Return the authenticated user's profile.

**Response 200**
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
Update mutable profile fields. Only provided fields are changed.

**Request body** (all optional)
```json
{ "displayName": "string", "defaultPlatform": "paypal|venmo|cashapp" }
```

### POST /api/v1/users/device
Register or replace a push notification token for the caller's device. Returns 204.

**Request body**
```json
{ "pushToken": "expo_token_string", "platform": "ios|android|web" }
```

---

## Payments

TabUp never processes or holds money. These endpoints manage the handles users register on each
payment platform and generate the deep links that participants use to pay each other directly.

### GET /api/v1/payments/handles
List the authenticated user's registered payment handles.

**Response 200**
```json
[
  { "id": "uuid", "platform": "venmo",   "handle": "john-doe", "verifiedAt": null },
  { "id": "uuid", "platform": "cashapp", "handle": "johndoe",  "verifiedAt": null }
]
```

### POST /api/v1/payments/handles
Register or update a handle for a given platform.
Handles are validated against platform-specific character rules before storage.

**Request body**
```json
{ "platform": "paypal|venmo|cashapp", "handle": "your-handle" }
```

Handle format rules:
- PayPal: letters, numbers, dots, hyphens, underscores; max 40 chars
- Venmo: letters, numbers, dots, hyphens, underscores; max 30 chars
- CashApp: letters and numbers only; max 20 chars (stored without the $ prefix)

### DELETE /api/v1/payments/handles/:platform
Remove a registered handle. Returns 204.

### POST /api/v1/payments/link
Generate a payment link for a participant to pay another user on a specific platform.

**Request body**
```json
{
  "payeeUserId":  "uuid",
  "platform":     "paypal|venmo|cashapp",
  "amountCents":  4000,
  "note":         "Birthday dinner"
}
```

**Response 200**
```json
{
  "platform":    "venmo",
  "paymentUrl":  "venmo://paycharge?txn=pay&recipients=john-doe&amount=40.00&note=Birthday+dinner",
  "webFallback": "https://venmo.com/api/v5/paycharge?txn=pay&..."
}
```

Platform link formats:
- PayPal: `https://paypal.me/{handle}/{amount}`
- Venmo: deep link `venmo://paycharge?txn=pay&recipients={handle}&amount={amount}&note={note}` with web fallback
- CashApp: `https://cash.app/${handle}/{amount}`

---

## Friends

### GET /api/v1/friends
List accepted friends for the authenticated user.

### POST /api/v1/friends/invite
Send a friend request by phone number or email.
The raw value is hashed on arrival and never stored in clear text.

**Request body**
```json
{ "target": "phone|email", "value": "+15551234567" }
```

### POST /api/v1/friends/accept
Accept an inbound friend request.

**Request body**
```json
{ "friendId": "uuid" }
```

### DELETE /api/v1/friends/:id
Remove or reject a friend relationship. Either side may call this. Returns 204.

---

## Tabs (Bills)

### POST /api/v1/tabs
Create a new tab. Participant shares must sum to the bill total or the request is rejected server-side.
Payment links are generated for each participant at creation time when the owner has a handle registered.

**Request body**
```json
{
  "name":     "Birthday dinner",
  "location": "Blue Harbor",
  "total":    12000,
  "tax":      900,
  "tip":      1800,
  "currency": "USD",
  "notes":    "Split apps evenly",
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
Fetch a tab with all participant details. Only the owner or a registered participant may view.

### POST /api/v1/tabs/:id/split
Update participant share amounts (owner only, open tabs only).
New shares must still sum to the original bill total.

**Request body**
```json
{ "splits": [{ "participantId": "uuid", "share": 6000 }] }
```

### POST /api/v1/tabs/:id/settle
Mark a participant as paid (owner only).
If all participants are paid the tab status becomes `settled` automatically.

**Request body**
```json
{ "participantId": "uuid" }
```

### DELETE /api/v1/tabs/:id
Cancel an open tab (owner only). Returns 204.

---

## Ledger

### GET /api/v1/ledger
Paginated history of ledger entries for the authenticated user.

**Query parameters**
- `cursor` - ISO timestamp from the previous page's `nextCursor`
- `limit` - page size, default 20, max 100

**Response 200**
```json
{
  "items": [
    { "tabId": "uuid", "delta": -4000, "settled": false, "createdAt": "..." }
  ],
  "nextCursor": "2026-01-01T00:00:00.000Z"
}
```

Positive `delta` means the user is owed money on that tab; negative means they owe.

---

## Groups

### POST /api/v1/groups
Create a group. The creator is added as a member automatically.

**Request body**
```json
{ "name": "Roommates", "memberIds": ["uuid", "uuid"] }
```

### GET /api/v1/groups/:id
Fetch a group with its member list. Only members may view.

---

## Uploads

### POST /api/v1/uploads/presign
Get a presigned S3 PUT URL for uploading a receipt photo or profile avatar.
Upload directly to S3 from the mobile client using the returned URL, then pass the `key`
back to the relevant endpoint to associate it with a record.

**Request body**
```json
{ "purpose": "receipt|avatar", "mime": "image/jpeg|image/png|image/webp", "size": 512000 }
```

**Response 200**
```json
{ "uploadUrl": "https://s3.amazonaws.com/...", "key": "uploads/...", "fileUrl": null }
```

Allowed MIME types: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`. Max size: 10 MB.

---

## Rate limits

| Route group         | Limit (per IP)     |
|---------------------|--------------------|
| POST /auth/exchange | 10 req / min       |
| All other routes    | 100 req / min      |

---

## Versioning

Current version: `v1`. Breaking changes increment the version prefix. Clients should send
`X-Client-Version` for telemetry and gradual rollout support.

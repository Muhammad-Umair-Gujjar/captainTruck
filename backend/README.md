# Captain Truck API

NestJS backend for **Captain Truck** (FYP). Flutter apps live in separate repos; admin panel will be added later in this monorepo.

Package manager: **npm** (locked — do not switch without team agreement).

## Phase status

| Phase | Status |
|------:|--------|
| 0 — Scaffold & baseline | Complete |
| 1 — Config / security / rate limit | Complete |
| 2 — Neon + Prisma | Complete |
| 3 — Auth JWT | Complete |
| 4 — Users / profiles | Complete |
| 5 — Truck types & rates | Complete |
| 6 — Dispatch create | Complete |
| 7 — OSM routing | Complete |
| 8 — AI cost / bill | Complete |
| 9 — Admin review / assign | Complete |
| 10 — Trips + Socket.IO GPS | Complete |
| 11 — Media + chat | Complete |
| 12 — Chat 90-day TTL | Complete |
| 13 — Payments (cash + Stripe test) | Complete |
| 14 — Commission ledger | Complete |
| 15 — FCM push | Complete (awaiting sign-off) |
| 16 — Harden + deploy prep | Next |

### Notifications / FCM (Phase 15)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/v1/notifications/status` | `{ configured }` — needs `FCM_PROJECT_ID` + `FCM_CLIENT_EMAIL` + `FCM_PRIVATE_KEY` |
| GET | `/api/v1/notifications/tokens` | List my device tokens |
| POST | `/api/v1/notifications/tokens` | Register token `{ token }` |
| DELETE | `/api/v1/notifications/tokens` | Unregister `{ token }` |

Pushes (no-op if FCM unset or user has 0 tokens): **assign**, **reject**, **trip status**, **chat message**, **payment result**.  
Invalid/expired tokens are pruned from `users.fcmTokens`. Payment pushes never include amounts or card details.

### Commissions (Phase 14)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/v1/commissions/mine` | Driver ledger |
| GET | `/api/v1/commissions/admin` | Admin list (`driverId`, `unconfirmedOnly`) |
| GET | `/api/v1/commissions/admin/summary` | Per-driver totals |
| GET | `/api/v1/commissions/:id` | Detail |
| POST | `/api/v1/commissions/:id/confirm` | Admin only — drivers cannot self-confirm |

On trip **complete**: ledger row with snapshotted `COMMISSION_PERCENT`.  
**Rule:** driver owes platform `%` of `finalBill` whether fare was cash or Stripe.  
Complete is **blocked** until payment is `PAID` or `CASH_COLLECTED`.

### Payments (Phase 13)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/v1/payments/stripe/status` | Test-mode configured? |
| POST | `/api/v1/payments` | `{ requestId\|tripId, provider, idempotencyKey, clientAmountCents? }` |
| GET | `/api/v1/payments/by-request/:requestId` | List payments |
| GET | `/api/v1/payments/:id` | Payment detail |
| POST | `/api/v1/payments/:id/cash/collect` | Driver/admin: cash collected (idempotent) |
| POST | `/api/v1/payments/webhook/stripe` | Public; Stripe-Signature + raw body |

Cash: `CASH_PENDING` → `CASH_COLLECTED`. Stripe: PaymentIntent + webhook → `PAID`/`FAILED`/`CANCELLED`.  
Amount always = server `totalBillCents`. **Refunds out of scope.** Set `STRIPE_SECRET_KEY` (`sk_test_…`) + `STRIPE_WEBHOOK_SECRET`.

### Chat retention (Phase 12)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/v1/chat/retention/run` | Admin: manual cleanup (Redis lock; idempotent) |

Cron: daily **03:00** deletes messages older than `CHAT_TTL_DAYS` (default **90**).  
Also best-effort Cloudinary destroy when `CLOUDINARY_*` is set. Overlapping runs skip via Redis NX lock.

### Media + chat (Phase 11)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/v1/media/status` | `{ configured }` |
| POST | `/api/v1/media/sign` | Signed Cloudinary upload params (`CLOUDINARY_*` required) |
| POST | `/api/v1/chat/trips/:tripId/threads` | Body `{ type: DRIVER_CUSTOMER \| DRIVER_ADMIN }` |
| GET | `/api/v1/chat/threads/mine` | My threads |
| GET | `/api/v1/chat/threads/:id/messages` | Cursor pagination (`cursor`, `limit`) |
| POST | `/api/v1/chat/threads/:id/messages` | `TEXT`/`PRESET` need `body`; `IMAGE`/`VOICE` need Cloudinary `mediaUrl` |
| POST | `/api/v1/chat/messages/:id/report` | Abuse flag |

Policy: chat becomes **read-only immediately** when trip is `COMPLETED` or `CANCELLED`.  
Media URLs must be `https://res.cloudinary.com/{cloudName}/…` (or `test-cloud` host in local tests without credentials).

Socket: `chat:join` / `chat:leave` `{ threadId }`; server emits `chat:message` to `chat:{id}`, trip room, participants, `admin:ops`.

### Trips + realtime GPS (Phase 10)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/v1/trips/:id/status` | Driver/admin: advance lifecycle (idempotent) |
| POST | `/api/v1/trips/:id/location` | Driver GPS; throttled **3s**; sealed after complete/cancel |
| GET | `/api/v1/trips/:id/location` | Live (Redis) or last-known + `stale` flag |

**Socket.IO** namespace: `/realtime`  
Auth: `auth: { token }` or `Authorization: Bearer` or `?token=`  

| Event | Direction | Notes |
|-------|-----------|--------|
| `connected` | server→client | After JWT OK; auto-joins `user:{id}`, admins also `admin:ops` |
| `trip:join` | client→server | `{ tripId }` — authorized participants only |
| `trip:leave` | client→server | Leave `trip:{id}` |
| `location:update` | client→server | `{ tripId, lat, lng, heading?, speedMps? }` |
| `location:updated` | server→room | Broadcast to `trip:{id}` + `admin:ops` |
| `trip:status` | server→room | On status change |
| `chat:join` / `chat:leave` | client→server | `{ threadId }` |
| `chat:message` | server→room | New chat message |

`REDIS_URL` optional — in-memory fallback for local/test (not multi-instance). Prefer Upstash `rediss://` for deploy.

### Admin assign (Phase 9)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/v1/dispatches/admin/pending` | Queue of `pending_admin` |
| POST | `/api/v1/dispatches/:id/approve` | Body `{ driverId, note? }` → trip + `approved_assigned` |
| POST | `/api/v1/dispatches/:id/reject` | Body `{ reason }` required (min 3 chars) |
| GET | `/api/v1/trips/mine` | Driver: own assignments only |
| GET | `/api/v1/trips/:id` | Assigned driver, customer owner, or admin |

Multi-truck: **one lead driver** regardless of `truckCount` (billing still uses count).  
Approve is atomic (row lock + trip create). Busy/disabled/unavailable drivers → `DISPATCH_017/018/019`.

### Pricing (Phase 8) — Flutter contract

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/v1/dispatches/:id/routes/:routeOptionId/select` | Body: `{ aiCostCents, clientTotalBillCents? }` → `PENDING_ADMIN` + `billBreakdown` |
| GET | `/api/v1/pricing/training-samples?limit=` | Last ≤20 completed trips for on-device TFLite retrain |

Bill formula (server-authoritative, PKR cents):  
`perTruck = lockedBaseRateCents + aiTripCostCents`; `totalBill = perTruck * truckCount`.  
`clientTotalBillCents` is ignored if sent. Outlier AI cost vs distance → `PRICE_002`.

`billBreakdown`: `{ currency, lockedBaseRateCents, aiTripCostCents, perTruckCents, truckCount, totalBillCents, authoritative, flaggedOutlier }`

### Routing (Phase 7) — Flutter contract

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/v1/osm/autocomplete?q=` | Photon proxy (auth + throttle) |
| POST | `/api/v1/dispatches/:id/routes/generate` | Needs coords or geocodes addresses; returns `routeOptions` |
| POST | `/api/v1/dispatches/:id/routes/:routeOptionId/select` | Body requires `aiCostCents` (Phase 8); → `PENDING_ADMIN` |

`routeOptions[]`: `{ id, polyline, distanceMeters, durationSeconds, aiCostCents, isRecommended, isSelected }`  
Prefer sending map-pin `lat/lng` on create to skip geocode. Fastest duration is `isRecommended`.

### Dispatches (Phase 6)

| Method | Path | Access |
|--------|------|--------|
| POST | `/api/v1/dispatches` | Customer (locks base rate at create) |
| GET | `/api/v1/dispatches/mine` | Customer |
| GET | `/api/v1/dispatches/admin/all` | Admin |
| GET | `/api/v1/dispatches/:id` | Owner or admin |
| POST | `/api/v1/dispatches/:id/submit` | Customer (draft → awaiting route) |
| POST | `/api/v1/dispatches/:id/cancel` | Owner or admin |

`lockedBaseRateCents` is snapshotted **at create** and never changed by later rate updates.

### Truck types (Phase 5)

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/v1/truck-types` | Public (active + current rate) |
| GET | `/api/v1/truck-types/:id` | Public (active) |
| GET | `/api/v1/truck-types/admin/all` | Admin |
| POST | `/api/v1/truck-types` | Admin |
| PATCH | `/api/v1/truck-types/:id` | Admin |
| POST | `/api/v1/truck-types/:id/rates` | Admin (new history row) |
| GET | `/api/v1/truck-types/:id/rates` | Admin (history) |

Rates are **integer cents**. Changing a rate never updates existing `lockedBaseRateCents` on dispatches.

### Users endpoints (Phase 4)

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/v1/users/me` | Bearer |
| PATCH | `/api/v1/users/me` | Bearer |
| PATCH | `/api/v1/users/me/driver-profile` | Driver |
| GET | `/api/v1/users` | Admin |
| GET | `/api/v1/users/:id` | Admin |
| PATCH | `/api/v1/users/:id/status` | Admin |
| PATCH | `/api/v1/users/:id/profile` | Admin |
| PATCH | `/api/v1/users/:id/driver-profile` | Admin |

### Auth endpoints (Phase 3)

| Method | Path | Access |
|--------|------|--------|
| POST | `/api/v1/auth/register` | Public (customer only) |
| POST | `/api/v1/auth/login` | Public |
| POST | `/api/v1/auth/refresh` | Public |
| POST | `/api/v1/auth/logout` | Public (refresh body) |
| GET | `/api/v1/auth/me` | Bearer |
| POST | `/api/v1/auth/drivers` | Admin Bearer |

Full plan: [PHASE_PLAN.md](./PHASE_PLAN.md)

### Database (Neon + Prisma)

| Env var | Use |
|---------|-----|
| `DATABASE_URL` | **Pooled** Neon URL — runtime NestJS / Prisma Client |
| `DATABASE_URL_DIRECT` | **Direct** (non-pooler) Neon URL — `prisma migrate` |

Money is stored as **integer cents** (PKR), never floats.

```bash
npm run prisma:generate
npm run prisma:migrate        # uses directUrl
npm run prisma:seed           # idempotent admin + truck types
```

Seeded admin (change after demos): `admin@captaintruck.local` / `Admin@12345`

### Rate-limit policy (Phase 1)

In-memory throttling via `@nestjs/throttler`. If the process restarts, counters reset (**fail-open**). Redis-backed limits come in Phase 10; when Redis is down we keep fail-open for general routes (FYP demos), with stricter fail-closed planned for auth.

## Prerequisites

- Node.js 20+ (LTS recommended)
- npm 10+

## Setup

```bash
cd backend
cp .env.example .env
npm install
npm run start:dev
```

## Endpoints (Phase 0)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Health probe |
| GET | `/api/docs` | Swagger UI (non-production) |

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run start:dev` | Watch mode |
| `npm run build` | Compile |
| `npm run start:prod` | Run `dist/main` |
| `npm run lint` | ESLint |
| `npm run test` | Unit tests |
| `npm run test:e2e` | E2E tests |

## Environment

See `.env.example` for all planned keys. Phase 0 only requires `NODE_ENV` and `PORT` (defaults work without a `.env` file).

## Response envelope

Success:

```json
{
  "success": true,
  "data": {},
  "meta": { "path": "/api/v1/health", "timestamp": "...", "correlationId": null }
}
```

Error:

```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] },
  "meta": { "statusCode": 400, "path": "...", "timestamp": "...", "correlationId": null }
}
```

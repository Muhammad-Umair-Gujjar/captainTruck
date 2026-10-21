# Captain Truck — Backend Phase Plan

> **Scope of this repo:** NestJS API only (Flutter apps = separate repos; Admin React = later in this repo).  
> **Database:** Neon PostgreSQL — integrate when credentials are ready (Phase 2). No local Postgres.  
> **Rule:** Finish → test → pass exit checklist → only then start the next phase.

---

## Architecture principles (all phases)

| Principle | Practice |
|-----------|----------|
| Layering | `Controller → Service → Repository/Prisma`; no business logic in controllers |
| Validation | `class-validator` + DTOs on every input; reject unknown fields |
| Errors | Global exception filter; stable error codes (`AUTH_001`, `DISPATCH_003`, …) |
| AuthZ | JWT + role guards + resource ownership checks (never trust client `userId`) |
| Config | `@nestjs/config` + Zod/Joi schema; fail fast if required env missing |
| Secrets | `.env` / `.env.example` only; never commit secrets |
| Logging | Structured logger (Pino); request `correlationId`; no PII in logs |
| Idempotency | Critical writes (payments, assign driver) support idempotency keys |
| Soft deletes | Users/trips/chats where audit matters; hard delete only for chat TTL job |
| Transactions | Multi-table writes in DB transactions |
| API style | Versioned REST (`/api/v1/...`) + Socket.IO namespace `/realtime` |
| Docs | OpenAPI (Swagger) from Phase 0 onward |
| Tests per phase | Unit (services) + e2e (critical routes) before phase sign-off |
| Free-tier care | Connection pooling for Neon; Redis timeouts; rate limits on public routes |

### Roles

| Role | Primary capabilities |
|------|----------------------|
| `customer` | Register/login, create dispatch, select route, pay (Stripe/cash intent), chat on active trip, track |
| `driver` | Login (admin-registered), view assignments, navigate/update GPS, chat, confirm cash collected |
| `admin` | Approve/reject, assign driver/truck, base rates, driver registration, ledger, bills, reports |

### High-level domain map

```
Auth/Users → TruckTypes/Rates → DispatchRequests → Routes/Pricing
    → Admin Review/Assign → Trips + GPS → Chat → Payments → Commission Ledger
    → Notifications (FCM) → Media (Cloudinary) → Jobs (TTL, cleanup)
```

---

## Gate process (every phase)

Before moving on, all must be true:

1. [ ] Phase **Deliverables** implemented  
2. [ ] Phase **Edge cases** handled or explicitly deferred with ticket  
3. [ ] Phase **Exit checklist** 100% green  
4. [ ] Manual smoke test recorded (commands + expected results)  
5. [ ] No open P0/P1 bugs for this phase  
6. [ ] User (you) explicitly says: **“Phase N approved — proceed”**

---

## Phase 0 — Project scaffold & engineering baseline

**Goal:** Runnable NestJS app with production tooling; no business features yet.

### Deliverables
- NestJS (TypeScript) app under `backend/`
- Package manager locked (`npm` or `pnpm` — pick one and keep)
- Folder structure: `src/modules/*`, `src/common/*`, `src/config/*`
- ESLint + Prettier + TypeScript strict mode
- Git hygiene: `.gitignore`, `.env.example`
- Health endpoint: `GET /api/v1/health`
- Swagger at `/api/docs` (dev)
- Global ValidationPipe, exception filter, response interceptor (optional envelope)
- README: how to run, env vars list

### Edge cases
- Missing `.env` → clear startup error (not cryptic crash)
- Invalid `NODE_ENV` → default safely to `development`
- Port already in use → clear log message

### Exit checklist
- [x] `npm run start:dev` boots
- [x] `/api/v1/health` returns 200
- [x] Swagger loads
- [x] Lint + typecheck pass
- [x] `.env.example` documents all planned keys (even if unused yet)

**Smoke test (2026-10-21):** `GET /api/v1/health` → 200 enveloped ok; `GET /api/docs` → 200; unit + e2e green.

**Depends on:** nothing  
**Blocks:** all later phases

---

## Phase 1 — Config, security headers, rate limit, observability

**Goal:** Hardening shell before any data layer.

### Deliverables
- Config module with typed env (DB URL, JWT secrets, Redis, Stripe, Cloudinary, FCM, OSRM, CORS origins)
- Helmet, CORS allowlist (Flutter debug + admin Vercel + localhost)
- Global rate limiting (stricter on auth routes later; baseline now)
- Request ID middleware
- Graceful shutdown hooks
- Separate `development` / `production` log levels

### Edge cases
- Wildcard CORS in production → forbidden
- Empty JWT secret in production → refuse to start
- Rate-limit Redis down → fail-open vs fail-closed policy documented (recommend fail-open with warning for FYP demo; fail-closed for auth if Redis up)

### Exit checklist
- [x] App refuses boot if production secrets missing (Zod: JWT + no wildcard CORS)
- [x] CORS rejects unknown origin in production config
- [x] Rate limit returns 429 with Retry-After
- [x] Every request has correlation id (`x-correlation-id` middleware + response meta)

**Smoke / tests (Phase 1):** unit + e2e green; rate-limit e2e asserts 429 + `Retry-After`.

**Depends on:** Phase 0  
**DB:** connection string stored in local `.env` (not committed); Prisma wiring is Phase 2

---

## Phase 2 — Database (Neon) + Prisma schema + migrations

**Goal:** Connect Neon PostgreSQL; define full schema; migrate; seed minimal data.

> **Start only after Neon connection string is available.**  
> Use Neon **pooled** connection for app + direct for migrations (document both).

### Deliverables
- Prisma (or TypeORM — **Prisma recommended** for FYP clarity) wired to NestJS
- Migrations + seed script (admin user, default truck types)
- Core tables (initial design — refine during phase):
  - `users` (role, status, phone, email, passwordHash, fcmTokens[])
  - `driver_profiles` (license, docs refs, availability, admin notes)
  - `truck_types` (name, capacity, active)
  - `base_rates` (truckTypeId, amount, effectiveFrom; historical)
  - `dispatch_requests` (customerId, status, pickup/drop, truckCount, truckTypeId, notes, lockedBaseRate, paymentMethod)
  - `route_options` (requestId, polyline, distanceM, durationS, aiCost, isRecommended, selected)
  - `trips` (requestId, driverId, status, timestamps, finalBill)
  - `trip_locations` or Redis-only live GPS + periodic DB snapshot (decide in phase; prefer Redis live + DB last-known)
  - `chats` / `messages` (type text|image|voice|preset, mediaUrl, createdAt)
  - `commission_ledger` (driverId, tripId, expected, collected, pending, adminConfirmedAt)
  - `payments` (provider stripe|cash, status, amount, stripeSessionId/paymentIntentId, idempotencyKey)
  - `refresh_tokens` (hashed token, expires, revoked)
  - `audit_logs` (admin actions)
- Indexes on foreign keys + status + createdAt
- DB health in `/health` (optional deep check)

### Edge cases
- Neon cold start / connection timeout → retry with backoff
- Migration drift → CI check `prisma migrate diff`
- Seed run twice → idempotent seed
- Soft-deleted user cannot login
- Decimal money fields: use `Decimal` / integer **cents** (prefer cents to avoid float bugs)

### Exit checklist
- [x] Migrate succeeds against Neon (`20261021182740_phase2_init`)
- [x] Seed creates 1 admin + sample truck types (idempotent)
- [x] Prisma Client usable in a sample repository test (e2e `user.count`)
- [x] Money stored as integer cents (`*Cents` fields)
- [x] Connection pooling documented in README (pooled vs directUrl)

**Depends on:** Phase 0–1 + Neon credentials  
**Blocks:** Auth and all domains

---

## Phase 3 — Authentication & session security

**Goal:** Secure JWT auth for customer / driver / admin.

### Deliverables
- Register (customer self-serve)
- Login (all roles)
- Refresh token rotation
- Logout / revoke refresh
- Password hashing (argon2 or bcrypt)
- Role guard + `@Roles()`
- `GET /auth/me`
- Admin-only: create driver account (drivers do not self-register publicly — per proposal)

### Edge cases
- Duplicate email/phone
- Case-insensitive email
- Brute force → stricter rate limit + lockout after N failures (temporary)
- Refresh token reuse detection → revoke family
- Access token expired vs invalid (distinct errors)
- Disabled / pending / rejected driver cannot login
- Customer registers as admin → impossible (role fixed server-side)
- JWT `alg=none` / wrong issuer → reject

### Exit checklist
- [x] Customer register + login works
- [x] Admin login works (seeded)
- [x] Driver login works only after admin-created account
- [x] Refresh rotation works; reuse rejected
- [x] Role guard blocks cross-role routes
- [x] e2e tests for happy path + 4+ failure paths (duplicate email, bad password, role forbidden, disabled user, refresh reuse)

**Depends on:** Phase 2

---

## Phase 4 — Users, profiles, admin user management

**Goal:** Profile CRUD and admin controls.

### Deliverables
- Customer/driver profile get/update (safe fields only)
- Admin: list/search users, disable/enable, view driver docs metadata
- Driver registration flow (admin creates + optional docs upload URLs from Phase 11)

### Edge cases
- Update email to one already taken
- User deletes/deactivates mid-trip → block or force complete policy
- Admin cannot disable last active admin
- Phone format validation (PK-friendly)

### Exit checklist
- [x] Ownership: user A cannot edit user B (admin-only routes blocked by role guard)
- [x] Admin disable prevents login
- [x] Validation covers empty names, oversized fields
- [x] Last active admin cannot be disabled
- [x] Driver with active trips cannot be disabled

**Depends on:** Phase 3

---

## Phase 5 — Truck types & base rates

**Goal:** Admin-managed catalog; rates locked onto requests at creation time.

### Deliverables
- CRUD truck types (admin)
- Set/update base rate per truck type
- Rate history (effective dating)
- Public/customer: list active truck types + current rate

### Edge cases
- Changing rate must **not** alter in-flight requests (lock snapshot on request)
- Deactivate truck type with open requests → block or soft-warn
- Zero/negative rates rejected
- Concurrent rate updates → last-write with audit log

### Exit checklist
- [ ] Rate change does not mutate old `dispatch_requests.lockedBaseRate`
- [ ] Customer only sees active types
- [ ] Audit log entry on rate change

**Depends on:** Phase 3–4

---

## Phase 6 — Dispatch request creation (without final route yet)

**Goal:** Customer creates draft/pending request with pickup/drop and truck needs.

### Deliverables
- Create dispatch request (addresses, lat/lng optional until map pin, truckCount, truckType, pickup date, notes)
- List my requests (customer)
- Get request by id (owner/admin)
- Status machine (initial): `draft` → `awaiting_route_selection` → `pending_admin` → …

### Edge cases
- Pickup in the past
- Drop == pickup
- Invalid coordinates
- truckCount < 1 or absurdly high (cap)
- Customer spam → rate limit
- Unauthenticated create → 401

### Exit checklist
- [ ] Status transitions enforced in service (no client status overwrite)
- [ ] lockedBaseRate captured from current rate at create/route-finalize (document exact moment)
- [ ] Customer sees only own requests

**Depends on:** Phase 5

---

## Phase 7 — OSM routing integration (OSRM + geocode helpers)

**Goal:** Server-side route alternatives for a request; store options; customer selects one.

### Deliverables
- Service clients: OSRM (`alternatives=true`), optional Nominatim/Photon proxy (to hide/limit abuse)
- Generate 2–3 route options (distance, duration, polyline)
- Mark fastest as `isRecommended`
- Customer select route → request moves to `pending_admin`
- Fallback when only 1 route returned
- Admin can preview selected route on request detail

### Edge cases
- OSRM/Nominatim downtime → graceful 503 + retry message
- Timeout (public demo servers are slow) → configurable timeout + circuit breaker
- No route found between points
- Alternatives < 2 → still allow single route
- Polyline too large → size limit / compression strategy
- Rate abuse of geocode proxy
- Pakistan geocode ambiguity → allow client lat/lng pin override (store both address text + coords)

### Exit checklist
- [ ] Alternatives stored and returned consistently
- [ ] Selection is idempotent (re-select rules defined)
- [ ] External API failures don’t crash process
- [ ] Contract documented for Flutter apps

**Depends on:** Phase 6

---

## Phase 8 — Trip cost pricing (AI cost fields + bill formula)

**Goal:** Persist AI-predicted costs from mobile; compute bill server-side as source of truth.

> TFLite runs **on device**. Backend stores features/results, validates ranges, computes:
> `perTruck = lockedBaseRate + aiTripCost`; `totalBill = perTruck * truckCount`.

### Deliverables
- Accept AI cost per route option from customer app (with distance sanity checks)
- Recompute/verify bill on server
- Optional: store last-20 completed trips training samples API for mobile retrain sync
- Bill breakdown on request/trip payloads

### Edge cases
- Client sends negative / huge AI cost → reject or clamp + flag
- Distance vs AI cost mismatch (outlier) → warn admin
- Base rate missing → cannot finalize
- Currency: PKR cents integer
- Recalculation after admin rate change → must use locked rate only

### Exit checklist
- [ ] Server bill is authoritative (client total ignored if mismatch)
- [ ] Breakdown returned: base, ai, per truck, total
- [ ] Outlier rejection tested

**Depends on:** Phase 7

---

## Phase 9 — Admin review, approve/reject, driver assignment

**Goal:** Admin-mediated dispatch (core differentiator).

### Deliverables
- Admin queue: list `pending_admin`
- Approve / reject **with required reason** on reject
- Assign driver + truck (and multi-truck policy if truckCount > 1 — define: one lead driver vs N assignments)
- Driver receives assignment (API + later push/socket)
- Status: `approved_assigned` / `rejected` / etc.

### Edge cases
- Approve without assignment → invalid
- Assign unavailable/disabled driver
- Double-assign same driver to overlapping trips → conflict policy
- Race: two admins assign different drivers → transaction + row lock
- Reject after assign → clear assignment + notify
- Customer cancels while pending → allowed states only
- truckCount > 1 without enough drivers → explicit error

### Exit checklist
- [ ] Reject requires non-empty reason
- [ ] Assignment atomic with status update
- [ ] Driver cannot see others’ assignments
- [ ] Audit log for approve/reject/assign

**Depends on:** Phase 8

---

## Phase 10 — Trips lifecycle + realtime GPS (Socket.IO)

**Goal:** Active trip tracking and status updates.

### Deliverables
- Trip entity created on assignment
- Status: `assigned` → `en_route_pickup` → `arrived_pickup` → `in_transit` → `delivered` → `completed` / `cancelled`
- Socket.IO auth (JWT on handshake)
- Rooms: `trip:{id}`, `user:{id}`, `admin:ops`
- Driver publishes location (throttled); customers/admin subscribe
- Redis for live location + pub/sub scale (even single node: good practice)

### Edge cases
- Socket connect without token / expired token
- Driver spoofs another trip’s room → join authorization
- Location spam → throttle (e.g. 2–5s)
- Driver offline mid-trip → last-known + stale indicator
- Complete trip twice → idempotent
- Customer tracks before assignment → forbidden
- Reconnect storm after network flap

### Exit checklist
- [ ] REST trip APIs + socket events documented
- [ ] Unauthorized room join fails
- [ ] Throttle verified
- [ ] Trip completion sealed (no further GPS writes)

**Depends on:** Phase 9 + Redis (Upstash or Oracle)

---

## Phase 11 — Media (Cloudinary) + chat foundations

**Goal:** Upload signed media; chat messages with types.

### Deliverables
- Signed upload (or server upload) to Cloudinary
- Chat threads: customer↔driver (active trip), driver↔admin
- Message types: text, image, voice, preset
- List messages (cursor pagination)
- Socket events for new messages
- Report message flag (abuse)

### Edge cases
- Upload non-allowed MIME / oversized file
- Message to trip not participating → 403
- Empty text / XSS stored (sanitize for admin web)
- Voice/image without Cloudinary URL
- Pagination `cursor` tampering
- Chat after trip completed → read-only window policy (define: 24h or lock immediately)

### Exit checklist
- [ ] Only participants can read/write
- [ ] Media URL validation (Cloudinary host allowlist)
- [ ] Pagination stable ordering

**Depends on:** Phase 10 (trip context) + Cloudinary account

---

## Phase 12 — Chat retention (90-day auto-delete)

**Goal:** Scheduled cleanup job.

### Deliverables
- Cron/queue job: delete messages older than 90 days (+ Cloudinary asset delete if owned)
- Admin config constant `CHAT_TTL_DAYS=90`
- Metrics/log of deleted counts

### Edge cases
- Partial delete failure → retry without duplicating work
- Job overlap (two instances) → distributed lock (Redis)
- Orphan media

### Exit checklist
- [ ] Job runnable manually in dev
- [ ] Messages older than TTL removed in test with fake dates
- [ ] Lock prevents double-run

**Depends on:** Phase 11

---

## Phase 13 — Payments: Cash-on-Pickup + Stripe Test Mode

**Goal:** Dual payment methods; no live charges required for FYP.

### Deliverables
- Request/trip `paymentMethod`: `cash` | `stripe`
- Stripe Checkout or PaymentIntent (test keys)
- Webhook endpoint with signature verify
- Payment status machine: `pending` → `requires_action` → `paid` / `failed` / `cancelled`
- Cash path: mark `cash_pending` → driver confirms collected → admin visible
- Idempotency keys on create payment

### Edge cases
- Webhook replay → idempotent processing
- Webhook before DB commit → handle out-of-order
- Customer switches method after paid → block
- Amount mismatch vs server bill → reject
- Stripe test card failures (decline) → surfaced cleanly
- Cash confirmed twice → idempotent
- Refunds → **out of scope** unless explicitly added later (document exclusion)

### Exit checklist
- [ ] Test mode pay success + decline paths
- [ ] Webhook signature failure → 400
- [ ] Cash flow works without Stripe
- [ ] Paid amount always equals server `totalBill`

**Depends on:** Phase 9+ (bill known); Stripe test keys

---

## Phase 14 — Commission ledger & reconciliation

**Goal:** Per-driver expected/collected/pending; admin confirmation.

### Deliverables
- On trip complete: create ledger entry (expected commission formula — configurable %)
- Admin confirm commission received
- Driver ledger list; admin per-driver summary
- Tie to cash or stripe flows (commission still owed by driver per business rule — document rule)

### Edge cases
- Complete trip without payment settled → policy (block complete vs allow with flag)
- Commission % change doesn’t alter past entries (snapshot %)
- Negative pending prevented
- Admin confirm without collected → invalid
- Double complete → one ledger row only

### Exit checklist
- [ ] Ledger math tested with fixtures
- [ ] Admin confirmation audited
- [ ] Driver cannot confirm their own commission as received

**Depends on:** Phase 13

---

## Phase 15 — Push notifications (FCM)

**Goal:** Notify mobile apps of assignment, chat, status, payment.

### Deliverables
- Register/unregister device tokens
- Send on: assign, reject, trip status, new chat, payment result
- Admin broadcast optional (skip if time-boxed)

### Edge cases
- Invalid/expired token → remove from DB
- User with 0 tokens → no-op success
- Fan-out failure partial → log and continue
- Do not send push with sensitive payment details

### Exit checklist
- [ ] Token CRUD works
- [ ] At least 3 event types send in test (Firebase console or mock)
- [ ] Bad tokens pruned

**Depends on:** Phase 9–11; FCM project

---

## Phase 16 — Hardening, compliance polish, deployment prep

**Goal:** Production-ready on Oracle Always Free.

### Deliverables
- Full OpenAPI review for Flutter teams
- Security pass: mass assignment, IDOR sweep, rate limits on heavy routes
- Backup/migrate runbook for Neon
- PM2/systemd + Nginx reverse proxy + HTTPS notes
- Env matrix for Oracle VM
- Load smoke: health + auth + one dispatch flow
- Final e2e suite: core happy path customer→admin→driver→complete

### Edge cases
- Neon quota / compute sleep → wake handling
- Disk full on VM logs → log rotate
- Zero-downtime migrate strategy (expand/contract)

### Exit checklist
- [ ] IDOR tests for all major resources
- [ ] Deploy docs complete
- [ ] Core e2e green against Neon
- [ ] Error codes documented for admin + mobile

**Depends on:** Phases 0–15 essentially complete

---

## Suggested implementation order (summary)

| Phase | Name | Needs external account? |
|------:|------|-------------------------|
| 0 | Scaffold | No |
| 1 | Config / security baseline | No |
| 2 | Neon + Prisma schema | **Yes — Neon** |
| 3 | Auth JWT | Neon |
| 4 | Users / profiles | Neon |
| 5 | Truck types & rates | Neon |
| 6 | Dispatch create | Neon |
| 7 | OSRM routes | Neon (OSRM public) |
| 8 | Pricing / bill | Neon |
| 9 | Admin approve & assign | Neon |
| 10 | Trips + Socket.IO GPS | Neon + Redis |
| 11 | Cloudinary + chat | Cloudinary |
| 12 | 90-day chat TTL job | Redis lock |
| 13 | Cash + Stripe test | Stripe test keys |
| 14 | Commission ledger | Neon |
| 15 | FCM push | Firebase (FCM only) |
| 16 | Harden + Oracle deploy prep | Oracle VM |

---

## Explicitly out of scope (unless you expand later)

- iOS apps  
- Live Stripe (production charges)  
- Bidding / automated matching  
- IoT trackers / NADRA  
- GraphQL  
- Local PostgreSQL  
- Building Flutter apps in this repo  

---

## Status tracker

| Phase | Status |
|------:|--------|
| 0 | Complete |
| 1 | Complete |
| 2 | Complete |
| 3 | Complete |
| 4 | Complete (exit checklist green) — awaiting approval to start Phase 5 |
| 5–16 | Not started |

---

## Next action (waiting on you)

1. Create Neon project and keep the connection strings ready (pooled + direct).  
2. Tell me to **start Phase 0** (scaffold NestJS in `backend/`) when you want coding to begin.  
3. Do **not** start Phase 2 until Neon is ready; Phases 0–1 can proceed without it.

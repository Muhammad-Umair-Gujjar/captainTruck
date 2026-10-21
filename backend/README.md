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
| 7 — OSM routing | Complete (awaiting sign-off) |
| 8 — AI cost / bill | Next |

### Routing (Phase 7) — Flutter contract

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/v1/osm/autocomplete?q=` | Photon proxy (auth + throttle) |
| POST | `/api/v1/dispatches/:id/routes/generate` | Needs coords or geocodes addresses; returns `routeOptions` |
| POST | `/api/v1/dispatches/:id/routes/:routeOptionId/select` | → `PENDING_ADMIN`; idempotent if already selected |

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

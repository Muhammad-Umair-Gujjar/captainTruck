# Captain Truck API

NestJS backend for **Captain Truck** (FYP). Flutter apps live in separate repos; admin panel will be added later in this monorepo.

Package manager: **npm** (locked — do not switch without team agreement).

## Phase status

| Phase | Status |
|------:|--------|
| 0 — Scaffold & baseline | Complete |
| 1 — Config / security / rate limit | Complete |
| 2 — Neon + Prisma | Complete (awaiting sign-off) |
| 3 — Auth JWT | Next |

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

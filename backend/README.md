# Captain Truck API

NestJS backend for **Captain Truck** (FYP). Flutter apps live in separate repos; admin panel will be added later in this monorepo.

Package manager: **npm** (locked — do not switch without team agreement).

## Phase status

| Phase | Status |
|------:|--------|
| 0 — Scaffold & baseline | In progress / complete when exit checklist passes |
| 1+ | Not started |

Full plan: [PHASE_PLAN.md](./PHASE_PLAN.md)

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

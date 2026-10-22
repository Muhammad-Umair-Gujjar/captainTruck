# OpenAPI review — Flutter teams

## How to get the spec

1. **Dev UI:** run API with `NODE_ENV=development` → [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
2. **Export JSON:** `npm run openapi:export` (builds then writes `docs/openapi.json`; gitignored — share with Flutter when cutting a release)

Swagger is **disabled in production** (`NODE_ENV=production`) for attack-surface reduction. Export from a staging/dev build.

## Conventions Flutter must follow

| Topic | Contract |
|-------|----------|
| Base URL | `{API_URL}/api/v1` |
| Auth | `Authorization: Bearer {accessToken}` |
| Refresh | `POST /auth/refresh` `{ refreshToken }` — rotate on every use; reuse → `AUTH_007` |
| Envelope | Always `{ success, data?, error?, meta }` — parse `data` only when `success === true` |
| Money | Integer **PKR cents** — never floats |
| Roles | `customer` \| `driver` \| `admin` — self-register is customer-only |
| IDs | Opaque cuid strings — never invent IDs client-side for ownership |
| Errors | Branch on `error.code` (see `ERROR_CODES.md`) |

## Critical mobile flows

1. **Customer book:** `POST /dispatches` → `POST …/routes/generate` → `POST …/routes/:id/select` `{ aiCostCents }` → wait admin
2. **Driver trip:** `GET /trips/mine` → `POST /trips/:id/status` lifecycle → `POST /trips/:id/location` (≤1 per 3s)
3. **Realtime:** Socket.IO `/realtime` with JWT; rooms `trip:{id}`, `chat:{id}`, `user:{id}`
4. **Chat media:** `POST /media/sign` → upload to Cloudinary → `POST /chat/threads/:id/messages` with `mediaUrl`
5. **Pay:** server bill wins — send `clientAmountCents` matching `billBreakdown.totalBillCents` or get `PAY_003`
6. **Push:** `POST /notifications/tokens` after FCM token refresh; prune handled server-side

## Do not rely on

- Client-computed totals (`clientTotalBillCents` ignored)
- Client-sent `role` / `passwordHash` (mass-assignment blocked by ValidationPipe)
- Swagger in production
- Amounts or card data in FCM payloads (never sent)

## Socket events (summary)

| Event | Who | Payload |
|-------|-----|---------|
| `trip:join` / `trip:leave` | client | `{ tripId }` |
| `location:update` | driver | `{ tripId, lat, lng, heading?, speedMps? }` |
| `location:updated` | server | live location |
| `trip:status` | server | `{ tripId, status, requestId }` |
| `chat:join` / `chat:leave` | client | `{ threadId }` |
| `chat:message` | server | public message |

Full tables live in `README.md`.

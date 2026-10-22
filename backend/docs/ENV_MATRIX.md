# Environment matrix — Oracle Always Free VM

Copy `.env.example` → `/opt/captain-truck/backend/.env` on the VM. Never commit secrets.

| Variable | Local / test | Oracle production | Notes |
|----------|--------------|-------------------|-------|
| `NODE_ENV` | `development` / `test` | **`production`** | Disables Swagger; stricter JWT/CORS checks |
| `PORT` | `3000` | `3000` (Nginx proxies 443→3000) | App binds localhost only behind Nginx |
| `API_URL` | `http://localhost:3000` | `https://api.yourdomain.com` | Used in logs / Stripe metadata |
| `CORS_ORIGINS` | Vite `5173` | Admin Vercel origin(s) | **No `*` in production** |
| `THROTTLE_TTL_MS` | `60000` | `60000` | Global window |
| `THROTTLE_LIMIT` | `120` / `1000` in e2e | `120` | Auth routes stricter in code |
| `DATABASE_URL` | Neon **pooled** | Neon pooled | Runtime Prisma |
| `DATABASE_URL_DIRECT` | Neon **direct** | Neon direct | `prisma migrate deploy` only |
| `JWT_ACCESS_SECRET` | any long string | **32+ random bytes** | Required in production |
| `JWT_REFRESH_SECRET` | different secret | **different 32+ bytes** | Required in production |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | `15m` | |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | `7d` | |
| `REDIS_URL` | optional | Upstash `rediss://…` or local Redis | GPS + chat retention lock |
| `STRIPE_SECRET_KEY` | `sk_test_…` | `sk_test_…` (FYP) | Live keys out of scope |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` | from Stripe CLI/dashboard | |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_…` | for Flutter | |
| `CLOUDINARY_*` | optional | set for media | Chat image/voice |
| `FCM_PROJECT_ID` | optional | Firebase project id | Push |
| `FCM_CLIENT_EMAIL` | optional | service account email | |
| `FCM_PRIVATE_KEY` | optional | PEM; use `\n` escapes in env | |
| `OSRM_BASE_URL` | public OSRM | public or self-host | Free tier OK |
| `OSM_USER_AGENT` | identify FYP | contact email required | Nominatim etiquette |
| `COMMISSION_PERCENT` | `10` | `10` | Snapshot on trip complete |
| `CHAT_TTL_DAYS` | `90` | `90` | Retention job |

## Neon sleep / wake

Free Neon may suspend compute. First request after sleep can take several seconds. Health returns `degraded` if DB ping fails — Nginx should **not** remove the upstream on a single failure; allow retries.

## Secrets hygiene

- Generate JWTs: `openssl rand -base64 48`
- FCM private key: paste full PEM; escape newlines as `\n` in single-line `.env`
- Rotate Stripe webhook secret if leaked; Test Mode only for FYP

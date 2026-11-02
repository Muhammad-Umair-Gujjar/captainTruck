# Captain Truck Admin

React admin panel (Vite + TypeScript + Tailwind) for dispatch ops. Hosted on **Vercel**.

Phase plan: [ADMIN_PHASE_PLAN.md](./ADMIN_PHASE_PLAN.md) — **A0–A7** complete.  
Smoke: [SMOKE.md](./SMOKE.md)

## Quick start

```bash
# Terminal 1 — API
cd ../backend && npm run start:dev

# Terminal 2 — Admin
cd ../admin
cp .env.example .env   # if needed
npm install
npm run dev
```

Open http://localhost:5173 — seed admin: `admin@captaintruck.local` / `Admin@12345`

Local Vite proxies `/api` → `http://localhost:3000` when `VITE_API_URL` is empty. For Socket.IO and production-like CORS, set both env vars to the Nest origin.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite on `:5173` |
| `npm run build` | Production bundle |
| `npm run preview` | Preview build (`:4173`) |
| `npm run typecheck` | `tsc -b` |

## Env

| Variable | Meaning |
|----------|---------|
| `VITE_API_URL` | Nest origin, e.g. `http://localhost:3000` or `https://api.example.com` (no trailing slash) |
| `VITE_SOCKET_URL` | Socket.IO origin (usually same as API) |

Copy from `.env.example`. These are **build-time** Vite vars — change them on Vercel, then redeploy.

### Production checklist (API ↔ admin)

1. Set Vercel env: `VITE_API_URL` + `VITE_SOCKET_URL` to the public HTTPS API.
2. On the Oracle API host, set `CORS_ORIGINS` to the admin origin(s), comma-separated, e.g.  
   `https://captain-truck-admin.vercel.app,https://admin.yourdomain.com`  
   - Exact scheme + host (and port if non-default)  
   - **Never** `*` in production (backend Zod rejects it)  
3. Socket.IO uses the same allowlist via HTTP CORS; clients connect to `VITE_SOCKET_URL` path `/realtime`.
4. After first Vercel URL is known, update `CORS_ORIGINS` and restart Nest (PM2).

See also [backend/docs/ENV_MATRIX.md](../backend/docs/ENV_MATRIX.md) and [backend/docs/DEPLOY.md](../backend/docs/DEPLOY.md).

## Deploy (Vercel)

1. Import the Git repo (or link CLI): project **Root Directory** = `admin`
2. Framework preset: Vite (or Other)
3. Build command: `npm run build`
4. Output directory: `dist`
5. Node: **20+** (`engines` in `package.json`)
6. Env: `VITE_API_URL`, `VITE_SOCKET_URL`
7. `vercel.json` — SPA rewrite (deep links) + basic security / asset cache headers

Optional CLI:

```bash
cd admin
npx vercel          # preview
npx vercel --prod   # production
```

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Login network / CORS error | `CORS_ORIGINS` missing Vercel URL; or wrong `VITE_API_URL` |
| Blank page on `/trips/:id` refresh | SPA rewrite missing (check `vercel.json`) |
| Map loads but no live GPS | Wrong `VITE_SOCKET_URL` or API Socket.IO/firewall |
| Stale API host after env change | Vite embeds env at **build** time — redeploy |

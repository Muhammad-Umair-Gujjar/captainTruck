# Captain Truck Admin

React admin panel (Vite + TypeScript + Tailwind) for dispatch ops. Hosted on **Vercel**.

Phase plan: [ADMIN_PHASE_PLAN.md](./ADMIN_PHASE_PLAN.md)

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

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite on `:5173` |
| `npm run build` | Production bundle |
| `npm run preview` | Preview build |
| `npm run typecheck` | `tsc -b` |

## Env

| Variable | Meaning |
|----------|---------|
| `VITE_API_URL` | Nest origin, e.g. `http://localhost:3000` |
| `VITE_SOCKET_URL` | Socket.IO origin (usually same) |

Production: set these on Vercel; add the Vercel URL to backend `CORS_ORIGINS`.

## Deploy (Vercel)

1. Root directory: `admin`
2. Build: `npm run build`
3. Output: `dist`
4. `vercel.json` already rewrites SPA routes to `index.html`

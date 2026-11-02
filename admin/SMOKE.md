# Admin SPA smoke checklist

Run after local changes or a Vercel deploy. API must be reachable; seed admin:
`admin@captaintruck.local` / `Admin@12345`.

## Build

```bash
cd admin
npm run typecheck
npm run build
npm run preview   # optional: http://localhost:4173
```

## Auth

- [ ] `/login` loads; wrong password shows API error
- [ ] Non-admin JWT rejected / redirected
- [ ] Successful login lands on dashboard
- [ ] Refresh the page while logged in — session survives (refresh token)
- [ ] Sign out clears session and returns to login

## Deep links (SPA rewrite)

- [ ] Open `/dispatches` and `/trips/some-id` directly (or refresh) — no 404
- [ ] On Vercel: hard-refresh a nested route after deploy

## Core ops

- [ ] Dashboard: API health OK; pending dispatch count loads
- [ ] Dispatches: open pending → approve/assign or reject
- [ ] Trips: list + open detail; live map connects when trip is active
- [ ] Users: list/filter; toggle status; create driver
- [ ] Truck types: list; create/edit; add base rate
- [ ] Commissions: unconfirmed list; open entry; confirm received

## Production CORS / Socket

- [ ] Browser console has no CORS errors against `VITE_API_URL`
- [ ] Live trip Socket.IO connects (`VITE_SOCKET_URL`, usually same origin as API)
- [ ] Backend `CORS_ORIGINS` includes the exact Vercel origin (`https://….vercel.app` or custom domain) — no trailing slash, no `*`

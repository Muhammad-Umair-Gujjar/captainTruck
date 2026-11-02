# Captain Truck — Admin panel phase plan

> **Scope:** React admin dashboard in `admin/` (Vite + TypeScript + Tailwind). Hosted on **Vercel**. Talks to NestJS API (`backend/`). Flutter apps stay in separate repos.

## Locked stack

| Layer | Choice |
|-------|--------|
| UI | React 19 + TypeScript |
| Bundler | Vite |
| Styling | Tailwind CSS v4 |
| Routing | React Router |
| Data | `fetch` + thin API client (no GraphQL) |
| Auth | JWT access + refresh (admin role only) |
| Realtime | Socket.IO client → `/realtime` |
| Maps | Leaflet + OSM tiles (match mobile OSM stack) |
| Host | Vercel |
| API | Existing NestJS `/api/v1` |

## Admin capabilities (from API)

1. Login / session (admin only)
2. Pending dispatch queue → approve + assign driver / reject
3. Dispatch & trip detail (bill, route, status)
4. Live trip GPS (Socket.IO `admin:ops`)
5. Users list / enable-disable / create driver
6. Truck types + base rates
7. Commission ledger confirm + summary
8. Ops extras: chat retention run, payment status (read)

## Phased delivery

| Phase | Goal | Exit checklist |
|------:|------|----------------|
| **A0** | Scaffold Vite app, layout shell, env, Vercel config | App runs on `:5173`; health ping to API |
| **A1** | Auth: login, refresh, logout, route guards | Non-admin rejected; token refresh works |
| **A2** | Dispatch queue + approve/reject/assign | Full pending → assigned or rejected via UI |
| **A3** | Trip detail + live map (Socket.IO) | Location updates on map for active trips |
| **A4** | Users & drivers | List/search, status, create driver |
| **A5** | Truck types & rates | CRUD types; add rate history row |
| **A6** | Commissions | List/summary; confirm collected |
| **A7** | Polish + Vercel | Env docs, CORS note, SPA rewrites, smoke |

**Process:** implement → smoke → approve → next (same gate as backend).

## Information architecture

```
/login
/                   → Dashboard (counts: pending, active trips)
/dispatches         → Pending queue + filters
/dispatches/:id     → Detail, approve/reject, trip link
/trips              → Active / recent
/trips/:id          → Status + live map
/users              → Customers / drivers / admins
/users/drivers/new  → Create driver
/truck-types        → Catalog + rates
/commissions        → Ledger + by-driver summary
/commissions/:id    → Detail + confirm received
```

## Local env

```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

Production: set Vercel env to `https://api.yourdomain.com`. Backend `CORS_ORIGINS` must include the Vercel URL.

## Out of scope (admin)

- Customer/driver self-serve UI
- Live Stripe production keys
- Building Flutter apps
- Replacing NestJS with BaaS

## Status

| Phase | Status |
|------:|--------|
| A0 | Complete (scaffold + health dashboard) |
| A1 | Complete (login / refresh / admin guard) |
| A2 | Complete (pending queue, approve/reject/assign) |
| A3 | Complete (trips list + live OSM map) |
| A4 | Complete (users list, status, create driver) |
| A5 | Complete (truck types + base rate history) |
| A6 | Complete (commission ledger + confirm) |
| A7 | Not started — next: polish + Vercel |

---

## Next action

Approve A6 to start **A7** (Vercel deploy polish, env docs, SPA smoke).

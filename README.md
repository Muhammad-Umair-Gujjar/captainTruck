# Captain Truck

FYP: **Captain Truck — Real-Time Logistics and Dispatch Platform**

This repository hosts:
- **NestJS backend** (`backend/`) — custom API (Phases 0–16 complete)
- **React admin panel** (`admin/`) — Vite + Tailwind → Vercel
- **Customer Flutter app** (`mobile_apps/customer_app/`) — Android + BLoC (phases C0+)

Driver Flutter app remains separate / later.

## Quick start

### API

```bash
cd backend
cp .env.example .env
npm install
npm run start:dev
```

- Health: http://localhost:3000/api/v1/health  
- Swagger: http://localhost:3000/api/docs  

### Admin

```bash
cd admin
cp .env.example .env
npm install
npm run dev
```

- UI: http://localhost:5173  
- Seed admin: `admin@captaintruck.local` / `Admin@12345`

## Docs

| Doc | Purpose |
|-----|---------|
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | Locked stack |
| [backend/PHASE_PLAN.md](backend/PHASE_PLAN.md) | API phases 0–16 |
| [admin/ADMIN_PHASE_PLAN.md](admin/ADMIN_PHASE_PLAN.md) | Admin phases A0–A7 |
| [backend/docs/DEPLOY.md](backend/docs/DEPLOY.md) | Oracle + Nginx + PM2 |
| [admin/README.md](admin/README.md) | Admin local + Vercel |
| [admin/SMOKE.md](admin/SMOKE.md) | Admin SPA smoke checklist |
| [mobile_apps/customer_app/CUSTOMER_PHASE_PLAN.md](mobile_apps/customer_app/CUSTOMER_PHASE_PLAN.md) | Customer Flutter phases |

## Current status

- Backend Phases **0–16** complete  
- Admin: **A0–A7** complete — ready for Vercel deploy  
- Customer Flutter: **C0–C1** complete (`mobile_apps/customer_app`) — next C2  




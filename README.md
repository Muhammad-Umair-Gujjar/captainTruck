# Captain Truck

FYP: **Captain Truck — Real-Time Logistics and Dispatch Platform**

This repository hosts:
- **NestJS backend** (`backend/`) — custom API
- **React admin panel** (to be added) — Vercel

Flutter Customer and Driver apps live in **separate repositories** (Android only).

## Quick start (backend)

```bash
cd backend
cp .env.example .env
npm install
npm run start:dev
```

- Health: http://localhost:3000/api/v1/health  
- Swagger: http://localhost:3000/api/docs  

## Docs

- Backend phase plan: [backend/PHASE_PLAN.md](backend/PHASE_PLAN.md)
- Locked decisions: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)
- Cursor agent rule: [.cursor/rules/captain-truck-stack.mdc](.cursor/rules/captain-truck-stack.mdc)

## Current status

- **Phase 0** complete (scaffold, health, Swagger, tests)
- **Phase 1** next (after approval)
- Neon DB integration starts at **Phase 2**

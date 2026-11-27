# Captain Truck — Project Context (migrated chat decisions)

Migrated from a chat that was started under `D:\RapidRiseTech\Vantix-App` by mistake.  
This file preserves locked product/tech decisions from that conversation.

## Product

- Title: Captain Truck — Comprehensive Real-Time Logistics and Dispatch Platform
- Team: Muhammad Umair, Muhammad Ali, Muhammad Shahzaib (UOG)
- Clients:
  1. Customer Flutter app (Android + iOS) — `mobile_apps/customer_app/`
  2. Driver Flutter app (Android + iOS) — `mobile_apps/driver_app/`
  3. Admin web (React + Vite + Tailwind on Vercel) — this repo
  4. NestJS API — this repo (`backend/`)

## Locked stack

| Layer | Choice |
|-------|--------|
| Backend | NestJS + TypeScript |
| Realtime | Socket.IO |
| Database | PostgreSQL on Neon (no local Postgres) |
| Cache | Redis (Upstash free or Oracle VM) |
| Auth | Custom JWT + refresh (roles: customer, driver, admin) |
| Push | FCM only |
| Files | Cloudinary |
| Maps | OSM (Nominatim, Photon, OSRM; Flutter: flutter_map) |
| AI | On-device TFLite cost + ML Kit Smart Reply |
| Payments | Cash-on-Pickup **and** Stripe **Test Mode** |
| API host | Oracle Cloud Always Free VM |
| Admin host | Vercel |
| Docker | Not required for local dev |

## In scope

- Admin-mediated assignment
- 2–3 OSM routes + AI trip cost
- Realtime GPS tracking
- Chat (text/image/voice) + Smart Reply + 90-day auto-delete
- Cash-on-Pickup + commission ledger
- Stripe Test Mode

## Process

- Implement **phase by phase**; previous phase must pass exit checklist and get approval before the next.
- Plan: `backend/PHASE_PLAN.md` (Phases 0–16)
- Backend Phases 0–16: **complete**.
- Admin panel (`admin/`): plan A0–A7 in `admin/ADMIN_PHASE_PLAN.md` — A0–A7 complete.
- Customer Flutter (`mobile_apps/customer_app/`): plan C0–C9 in `CUSTOMER_PHASE_PLAN.md` — C0–C9 complete (FCM token sync + Android/iOS polish); BLoC + vendored `liquid_glass_renderer`.
- Driver Flutter (`mobile_apps/driver_app/`): plan D0–D9 in `DRIVER_PHASE_PLAN.md` — D0–D4 complete (trip status machine); same glass + BLoC stack; Android + iOS.

## Accounts still needed

- Neon (Phase 2)
- Redis/Upstash (Phase 10+)
- Cloudinary (Phase 11)
- Stripe test keys (Phase 13)
- Firebase / FCM (Phase 15)
- Oracle Always Free (deploy per `backend/docs/DEPLOY.md`)

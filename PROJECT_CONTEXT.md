# Captain Truck — Project Context (migrated chat decisions)

Migrated from a chat that was started under `D:\RapidRiseTech\Vantix-App` by mistake.  
This file preserves locked product/tech decisions from that conversation.

## Product

- Title: Captain Truck — Comprehensive Real-Time Logistics and Dispatch Platform
- Team: Muhammad Umair, Muhammad Ali, Muhammad Shahzaib (UOG)
- Clients:
  1. Customer Flutter app (Android) — separate repo
  2. Driver Flutter app (Android) — separate repo
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
- Phases 0–11: **complete**; Phase 12 (chat 90-day TTL): implemented — awaiting sign-off before Phase 13 (payments)

## Accounts still needed

- Neon (Phase 2)
- Redis/Upstash (Phase 10+)
- Cloudinary (Phase 11)
- Stripe test keys (Phase 13)
- FCM (Phase 15)
- Oracle Always Free (Phase 16 deploy)

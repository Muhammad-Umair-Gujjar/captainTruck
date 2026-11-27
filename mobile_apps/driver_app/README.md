# Captain Truck — Driver app

Flutter + **BLoC** driver client (**Android + iOS**). Talks to NestJS in `backend/`.

Phase plan: [DRIVER_PHASE_PLAN.md](./DRIVER_PHASE_PLAN.md)

Drivers are **admin-created** (`POST /auth/drivers`); this app only supports login (no self-register).

## Glass UI

`liquid_glass_renderer` **0.2.0-dev.4** is vendored at:

`mobile_apps/vendor/flutter_liquid_glass/packages/liquid_glass_renderer`

Same pin as the customer app.

## Run

```bash
# Terminal 1 — API
cd ../../backend && npm run start:dev

# Terminal 2 — Driver (emulator)
cd ../mobile_apps/driver_app
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

Physical device: use your PC LAN IP instead of `10.0.2.2`.

## Smoke

**D0:** glass shell + Ping API health  
**D1:** driver login / logout (admin-created accounts only)  
**D2:** edit account + driver profile (license / plate / availability)  
**D3:** my assignments list + trip detail  
**D4:** advance trip status (`ASSIGNED` → … → `COMPLETED`)  
**D5:** live GPS share (Socket.IO `location:update`, REST fallback, ≥3s)  
**D6:** on-trip map (pickup / drop / self markers)

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

1. App opens on **Driver sign in**  
2. Sign in with a DRIVER account → home with role/status  
3. Customer/admin credentials must show role forbidden  
4. Sign out → back to login; kill/reopen with valid session → still signed in  
5. From home, **API health check** still works  
6. **Edit profile** → save account + driver plate/availability  
7. **My assignments** → open a trip detail (pickup/drop/customer)  
8. Advance status with the primary action button through the trip lifecycle  
9. On an active trip, **Start GPS sharing** → grant location → coords update  
10. **Open on-trip map** → pickup/drop/self markers; map follows GPS

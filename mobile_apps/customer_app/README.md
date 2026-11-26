# Captain Truck — Customer app

Flutter + **BLoC** customer client (**Android + iOS**). Talks to NestJS in `backend/`.

Phase plan: [CUSTOMER_PHASE_PLAN.md](./CUSTOMER_PHASE_PLAN.md)

## Glass UI

`liquid_glass_renderer` **0.2.0-dev.4** is vendored at:

`mobile_apps/vendor/flutter_liquid_glass/packages/liquid_glass_renderer`

(Source notes: `mobile_apps/vendor/flutter_liquid_glass/SOURCE.md`)

Pinned to 0.2.x because Flutter **1.0-dev** needs SDK ≥ 3.47; this machine is on **3.44.4**.

## Run

```bash
# Terminal 1 — API
cd ../../backend && npm run start:dev

# Terminal 2 — Customer (emulator)
cd ../mobile_apps/customer_app
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

Physical device: use your PC LAN IP instead of `10.0.2.2`.

## Smoke

**C0:** glass shell + Ping API health  
**C1:** register / login / logout (customer role only); session restores after restart

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

1. Create account → lands on home  
2. Sign out → login  
3. Sign in again → home; kill/reopen app → still signed in (secure storage)  
4. Admin/driver credentials must be rejected

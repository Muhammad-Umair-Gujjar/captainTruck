# Captain Truck — Customer app

Flutter + **BLoC** customer client (Android). Talks to NestJS in `backend/`.

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

## C0 smoke

1. App opens with glass panels + “Captain Truck”
2. **Ping API** → status ok when Nest is up
3. `flutter analyze` / `flutter test` clean

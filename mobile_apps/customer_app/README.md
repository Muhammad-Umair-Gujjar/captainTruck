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

## FCM (C9)

Push uses **FCM only** (`firebase_messaging`) → Nest `POST/DELETE /notifications/tokens`.

1. Create a Firebase project and add Android (`com.example.customer_app`) + iOS (`com.example.customerApp`) apps.
2. Replace placeholders:
   - `android/app/google-services.json`
   - `ios/Runner/GoogleService-Info.plist`
   - `lib/firebase_options.dart` (or run `flutterfire configure`)
3. Put the same service-account JSON on the Nest host (`FCM_*` env) so the API can send.
4. Until those files are real, the app still boots; push sync shows **Unavailable** and no-ops.

## Smoke

**C0–C8:** auth → book → routes → track → chat → pay  
**C9:** after login, home **Push notifications** card; with real Firebase, status becomes **Token registered**; sign-out unregisters

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

1. Create account → lands on home  
2. Sign out → login  
3. Sign in again → home; kill/reopen app → still signed in (secure storage)  
4. Admin/driver credentials must be rejected  
5. With Firebase configured: grant notification permission → token registers with API

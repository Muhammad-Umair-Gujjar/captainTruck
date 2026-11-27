# Captain Truck — Driver Flutter app phase plan

> **Path:** `mobile_apps/driver_app/` (this repo)  
> **Target:** Android **and iOS**  
> **State:** flutter_bloc  
> **UI glass:** `liquid_glass_renderer` vendored from GitHub → `mobile_apps/vendor/flutter_liquid_glass`  
> **API:** NestJS `backend/` (`/api/v1` + Socket.IO `/realtime`)

## Locked choices

| Layer | Choice |
|-------|--------|
| Framework | Flutter (Dart) |
| State | `flutter_bloc` + equatable |
| HTTP | `dio` + envelope `{ success, data, error, meta }` |
| Tokens | `flutter_secure_storage` |
| Maps | `flutter_map` + OSM tiles |
| Realtime | `socket_io_client` |
| Glass | path dep on vendored `liquid_glass_renderer` |
| Auth | **Login only** (admins create drivers via Nest `POST /auth/drivers`) |
| Money | PKR **cents** (ints only) |

## Phased delivery

| Phase | Goal | Exit checklist |
|------:|------|----------------|
| **D0** | Scaffold, BLoC baseline, glass shell, API health | App runs; glass demo; health ping |
| **D1** | Auth login / refresh / logout (driver role only) | Driver JWT against Nest; customer/admin rejected |
| **D2** | Profile + driver profile | `GET /users/me`, `PATCH /users/me/driver-profile` |
| **D3** | My assignments | `GET /trips/mine` list + detail |
| **D4** | Trip status machine | `POST /trips/:id/status` (`ASSIGNED` → … → `COMPLETED`) |
| **D5** | Live GPS publish | Geolocator + Socket `location:update` (REST fallback) |
| **D6** | On-trip map | `flutter_map`: pickup/drop + self marker; join `trip:` room |
| **D7** | Chat | Driver↔customer (+ admin); text first |
| **D8** | Cash collect + commissions | `POST /payments/:id/cash/collect`, `GET /commissions/mine` |
| **D9** | FCM + Android/iOS polish | token register/unregister |

**Process:** implement → smoke → you approve → next phase.

## Local env

```
--dart-define=API_BASE_URL=http://10.0.2.2:3000
```

- Android emulator → host machine: `http://10.0.2.2:3000`
- Physical device → LAN IP of the machine running Nest
- Never commit secrets; JWT stays in secure storage

## Status

| Phase | Status |
|------:|--------|
| D0 | Complete (scaffold, BLoC, glass, health) |
| D1 | Complete (login / refresh / logout; driver role only) |
| D2 | Complete (profile `/users/me` + driver-profile) |
| D3 | Complete (my assignments list + detail) |
| D4 | Complete (trip status machine) |
| D5 | Complete (live GPS publish) |
| D6 | Complete (on-trip map) |
| D7 | Not started |
| D8 | Not started |
| D9 | Not started |

## Next action

Approve to start **D7** (chat).

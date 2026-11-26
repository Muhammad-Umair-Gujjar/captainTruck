# Captain Truck — Customer Flutter app phase plan

> **Path:** `mobile_apps/customer_app/` (this repo)  
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
| Money | PKR **cents** (ints only) |

## Phased delivery

| Phase | Goal | Exit checklist |
|------:|------|----------------|
| **C0** | Scaffold, BLoC baseline, glass shell, API health | App runs; glass demo; health ping |
| **C1** | Auth register / login / refresh / logout | Customer JWT against Nest |
| **C2** | Profile + truck types | `/users/me`, `/truck-types` |
| **C3** | Create dispatch (map pickup/drop) | `POST /dispatches` |
| **C4** | Generate + select routes | routes → `pending_admin` |
| **C5** | My requests / wait for admin | `GET /dispatches/mine` |
| **C6** | Live trip track (Socket.IO) | map + `location:updated` |
| **C7** | Chat (+ media later) | threads / messages |
| **C8** | Cash + Stripe Test pay | payments APIs |
| **C9** | FCM + Android/iOS polish | token register |

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
| C0 | Complete (scaffold, BLoC, glass, health) |
| C1 | Complete (register / login / refresh / logout) |
| C2 | Complete (profile `/users/me` + truck types list) |
| C3 | Complete (map pickup/drop → `POST /dispatches`) |
| C4–C9 | Not started |

## Next action

Approve to start **C4** (generate + select routes → `pending_admin`).

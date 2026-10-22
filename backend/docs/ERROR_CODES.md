# Error codes — admin + mobile contract

All API errors use the envelope:

```json
{
  "success": false,
  "error": { "code": "AUTH_001", "message": "…", "details": [] },
  "meta": { "statusCode": 401, "path": "…", "timestamp": "…", "correlationId": null }
}
```

Clients should branch on `error.code`, not on free-text `message`.

## Auth (`AUTH_*`)

| Code | Meaning |
|------|---------|
| `AUTH_001` | Invalid credentials |
| `AUTH_002` | Account disabled |
| `AUTH_003` | Email already registered |
| `AUTH_004` | Phone already registered |
| `AUTH_005` | Temporary lockout (failed logins) |
| `AUTH_006` | Invalid refresh token |
| `AUTH_007` | Refresh token reuse detected |
| `AUTH_008` | Access token expired |
| `AUTH_009` | Access token invalid |
| `AUTH_010` | Role not allowed for this route |
| `AUTH_011` | Drivers cannot self-register |

## Users (`USER_*`)

| Code | Meaning |
|------|---------|
| `USER_001` | User not found |
| `USER_002` | Forbidden |
| `USER_003` | Email taken |
| `USER_004` | Phone taken |
| `USER_005` | Cannot disable last admin |
| `USER_006` | Driver has active trips |
| `USER_007` | Invalid status transition |
| `USER_008` | Not a driver |

## Trucks (`TRUCK_*`)

| Code | Meaning |
|------|---------|
| `TRUCK_001` | Truck type not found |
| `TRUCK_002` | Code already taken |
| `TRUCK_003` | Invalid rate |
| `TRUCK_004` | Has open dispatch requests |
| `TRUCK_005` | Truck type inactive |

## Dispatches (`DISPATCH_*`)

| Code | Meaning |
|------|---------|
| `DISPATCH_001` | Not found |
| `DISPATCH_002` | Forbidden (IDOR) |
| `DISPATCH_003` | Invalid input |
| `DISPATCH_004` | Pickup time in the past |
| `DISPATCH_005` | Same pickup/dropoff |
| `DISPATCH_006` | Invalid coordinates |
| `DISPATCH_007` | No rate for truck type |
| `DISPATCH_008` | Invalid status transition |
| `DISPATCH_009` | Truck inactive |
| `DISPATCH_010` | Route option not found |
| `DISPATCH_011` | Route locked |
| `DISPATCH_012` | Missing coordinates |
| `DISPATCH_013` | Rejection reason required |
| `DISPATCH_014` | Already assigned |
| `DISPATCH_015` | No selected route |
| `DISPATCH_016` | Driver not found |
| `DISPATCH_017` | Driver unavailable |
| `DISPATCH_018` | Driver busy |
| `DISPATCH_019` | Driver disabled |

## Trips (`TRIP_*`)

| Code | Meaning |
|------|---------|
| `TRIP_001` | Not found |
| `TRIP_002` | Forbidden (IDOR) |
| `TRIP_003` | Invalid status transition |
| `TRIP_004` | GPS sealed (completed/cancelled) |
| `TRIP_005` | GPS write throttled (3s) |
| `TRIP_006` | Invalid location payload |
| `TRIP_007` | Payment required before complete |

## OSM (`OSM_*`)

| Code | Meaning |
|------|---------|
| `OSM_001` | Upstream unavailable |
| `OSM_002` | No route found |
| `OSM_003` | Geocode failed |
| `OSM_004` | Timeout |
| `OSM_005` | Polyline too large |

## Pricing (`PRICE_*`)

| Code | Meaning |
|------|---------|
| `PRICE_001` | Invalid AI cost |
| `PRICE_002` | AI cost outlier vs distance |
| `PRICE_003` | Missing base rate |
| `PRICE_004` | No selected route |

## Media (`MEDIA_*`)

| Code | Meaning |
|------|---------|
| `MEDIA_001` | Cloudinary not configured |
| `MEDIA_002` | Invalid resource type |
| `MEDIA_003` | Invalid media URL |

## Chat (`CHAT_*`)

| Code | Meaning |
|------|---------|
| `CHAT_001` | Thread not found |
| `CHAT_002` | Forbidden (IDOR) |
| `CHAT_003` | Thread read-only |
| `CHAT_004` | Invalid message payload |
| `CHAT_005` | Message not found |
| `CHAT_006` | Invalid cursor |
| `CHAT_007` | Trip required |

## Payments (`PAY_*`)

| Code | Meaning |
|------|---------|
| `PAY_001` | Not found |
| `PAY_002` | Forbidden (IDOR) |
| `PAY_003` | Amount mismatch (client ≠ server bill) |
| `PAY_004` | Already paid |
| `PAY_005` | Invalid payment status |
| `PAY_006` | Stripe Test Mode not configured |
| `PAY_007` | Webhook signature invalid |
| `PAY_008` | No bill / missing request |
| `PAY_009` | Idempotency key conflict |
| `PAY_010` | Payment method locked |

## Commissions (`COMM_*`)

| Code | Meaning |
|------|---------|
| `COMM_001` | Not found |
| `COMM_002` | Forbidden |
| `COMM_003` | Already confirmed |
| `COMM_004` | Invalid amount |

## Notifications (`NOTIF_*`)

| Code | Meaning |
|------|---------|
| `NOTIF_001` | Invalid FCM token |
| `NOTIF_002` | Forbidden |

## Generic

| Code | Meaning |
|------|---------|
| `VALIDATION_ERROR` | `class-validator` failure (`details[]`) |
| `THROTTLED` / HTTP 429 | Rate limit; honor `Retry-After` |
| `INTERNAL_ERROR` | Unexpected server error |

Source of truth: `src/common/constants/error-codes.ts`.

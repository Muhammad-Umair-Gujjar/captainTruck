# Load / deploy smoke checklist

Run against Neon-backed API (local or Oracle). Prefer `NODE_ENV=production` mirror of secrets.

## Automated

```bash
cd backend
npm run test:e2e -- --testPathPatterns="happy-path|idor|app" --runInBand
```

- `happy-path` — customer → admin → driver → cash → complete  
- `idor` — cross-user access denied  
- `app` — health + baseline rate-limit behaviour  

## Manual curl smoke (post-deploy)

```bash
BASE=https://api.yourdomain.com   # or http://localhost:3000

# 1. Health (no auth; not throttled)
curl -sS "$BASE/api/v1/health" | jq .

# 2. Auth
curl -sS -X POST "$BASE/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@captaintruck.local","password":"Admin@12345"}' | jq .

# Save accessToken from response, then:

# 3. Truck types (public)
curl -sS "$BASE/api/v1/truck-types" | jq .

# 4. One dispatch slice (customer token)
# POST /dispatches → routes/generate → routes/:id/select → (admin) approve
# See README phase tables for bodies.
```

## Pass criteria

| Check | Pass |
|-------|------|
| Health `status` | `ok` (or brief `degraded` only while Neon wakes) |
| Login | `200` + tokens |
| Happy-path e2e | green |
| IDOR e2e | green |
| Disk | PM2 logrotate configured |
| TLS | HTTPS + Socket.IO upgrade works |

## Neon wake

If health is `degraded`, wait 5–15s and retry once before failing the smoke.

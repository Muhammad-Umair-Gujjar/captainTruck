# Deploy — Oracle Always Free + Nginx + PM2

Target: one Always Free VM (Ubuntu), NestJS API on Node 20+, Neon + Upstash/Redis, TLS via Let’s Encrypt.

## 1. VM prep

```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
```

Clone repo to `/opt/captain-truck`, create `.env` from `docs/ENV_MATRIX.md`.

```bash
cd /opt/captain-truck/backend
npm ci
npx prisma migrate deploy
npx prisma generate
npm run build
npm run prisma:seed   # once
```

## 2. PM2 process

Repo ships `backend/ecosystem.config.cjs` (single fork instance — FYP-safe for in-memory throttle / GPS fallback).

```bash
cd /opt/captain-truck/backend
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd
```

**systemd alternative:** `pm2 startup` installs a unit; or write `/etc/systemd/system/captain-truck-api.service` with `ExecStart=/usr/bin/node dist/main.js` and `Restart=always`.

## 3. Nginx reverse proxy

`/etc/nginx/sites-available/captain-truck`:

```nginx
upstream captain_api {
  server 127.0.0.1:3000;
  keepalive 16;
}

server {
  listen 80;
  server_name api.yourdomain.com;

  location / {
    proxy_pass http://captain_api;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    # Socket.IO
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
  }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/captain-truck /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.yourdomain.com
```

API sets `trust proxy = 1` so rate limits see the real client IP.

## 4. Log rotate (disk full)

PM2 logs: `~/.pm2/logs/`. Install rotate:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

Nginx: Ubuntu ships `/etc/logrotate.d/nginx` — keep it enabled.

## 5. Stripe webhooks

Point Stripe Test Mode webhook to `https://api.yourdomain.com/api/v1/payments/webhook/stripe`  
(raw body required — Nest `rawBody: true` already enabled).

## 6. Smoke after deploy

See `SMOKE.md`. Minimum:

```bash
curl -sS https://api.yourdomain.com/api/v1/health
```

## 7. Admin panel

Host React admin on **Vercel** (repo root directory `admin`). Full steps, env, and CORS checklist: [`admin/README.md`](../../admin/README.md). SPA smoke: [`admin/SMOKE.md`](../../admin/SMOKE.md).

1. Set Vercel `VITE_API_URL` + `VITE_SOCKET_URL` to this API’s HTTPS origin.
2. Set API `CORS_ORIGINS` to the exact Vercel (or custom) admin origin — no `*`.
3. Redeploy admin after env changes (Vite embeds vars at build time).

Flutter apps use the HTTPS API + Socket.IO wss (separate repos).

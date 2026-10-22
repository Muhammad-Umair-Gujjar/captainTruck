# Neon backup & migrate runbook

## Roles of the two URLs

| URL | Use |
|-----|-----|
| `DATABASE_URL` | Pooled (`-pooler`) — NestJS / Prisma Client at runtime |
| `DATABASE_URL_DIRECT` | Direct host — `prisma migrate` only |

Never run migrations through the pooler.

## Backup (free tier)

1. **Neon console → Branches / Backends → Point-in-time** (if plan allows) — prefer this for restore drills.
2. **Logical dump** (from a machine with `pg_dump` and the **direct** connection string):

```bash
pg_dump "$DATABASE_URL_DIRECT" --no-owner --format=custom -f captaintruck-$(date +%Y%m%d).dump
```

3. Store dumps off-VM (object storage / encrypted USB). Do not leave dumps on the Oracle boot volume long-term (disk full risk).

## Restore

```bash
pg_restore --clean --if-exists -d "$DATABASE_URL_DIRECT" captaintruck-YYYYMMDD.dump
```

Then restart the API (`pm2 restart captain-truck-api`).

## Migrations (expand / contract)

Zero-downtime friendly habit for FYP:

1. **Expand:** add nullable columns / new tables; deploy API that writes both old+new if needed.
2. Backfill data if required.
3. Deploy API that reads new shape.
4. **Contract:** drop obsolete columns in a later migrate (after Flutter clients updated).

Deploy migrate on the VM:

```bash
cd /opt/captain-truck/backend
export $(grep -v '^#' .env | xargs)   # or use dotenv carefully
npx prisma migrate deploy
npx prisma generate
pm2 restart captain-truck-api
```

## Quota / sleep

- If Neon returns connection errors after idle: retry once with backoff (Flutter already retries HTTP).
- Watch Neon dashboard for storage / compute limits before demos.

## Seed

Idempotent seed (admin + truck types):

```bash
npm run prisma:seed
```

Change default admin password after first deploy.

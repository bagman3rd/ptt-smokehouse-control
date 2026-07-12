# Smokehouse Control — Build 4.0.0

Build 4.0.0 is the **migration-repair and pilot-safety build**. It keeps production in safe db-push recovery mode, but gives you the runbook, admin visibility, and scheduled-backup structure needed before the PTT pilot creates data you cannot afford to lose.

## What changed in 4.0.0

- Added `MIGRATION_REPAIR_RUNBOOK_BUILD_4_0_0.md`.
- Added `PILOT_READINESS_BUILD_4_0_0.md`.
- Added `/api/admin/backups/weekly` for scheduled tenant backup exports.
- Added `CRON_SECRET` protection for scheduled backup calls.
- Added optional `BACKUP_POST_URL` support for sending scheduled backup JSON to an external storage receiver.
- Expanded `/admin/system` with:
  - Migration repair warning.
  - Scheduled backup readiness.
  - Migration repair runbook summary.
  - Weekly backup export status recording.
  - Data Quality Score positioning as a product/demo feature.
- Updated app/version references to Build 4.0.0.
- Kept Render in db-push recovery mode and avoided `--accept-data-loss`.

## Current production posture

The active Render database has a failed Prisma migration record. Production intentionally remains on:

```bash
prisma generate && prisma db push && tsx prisma/seed.ts && next build
```

Do **not** switch production back to:

```bash
prisma migrate deploy
```

until the staging repair runbook passes.

## Current Render build command

Keep the external Render build command as:

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --prod=false --frozen-lockfile=false && pnpm run render-build
```

## Scheduled backup endpoint

Build 4.0.0 adds:

```text
GET /api/admin/backups/weekly
Authorization: Bearer $CRON_SECRET
```

Required env var:

```text
CRON_SECRET=<12+ character secret>
```

Optional env var:

```text
BACKUP_POST_URL=<external endpoint that accepts JSON POSTs>
```

If `BACKUP_POST_URL` is set, the endpoint posts full tenant backup JSON to that destination. If not set, it records backup counts and returns them in the response. This does not replace Render PostgreSQL backups or restore drills.

## Required Render environment variables

```text
DATABASE_URL
ADMIN_PASSWORD
APP_SESSION_TOKEN
NEXT_PUBLIC_APP_NAME
NODE_VERSION=20.18.1
```

For scheduled backups add:

```text
CRON_SECRET
BACKUP_POST_URL optional
```

`ADMIN_PASSWORD`, `APP_SESSION_TOKEN`, and `CRON_SECRET` must be at least 12 characters.

## Initial admin login

```text
username: admin
password: Render ADMIN_PASSWORD value
```

## Migration repair sequence

Use the full runbook in:

```text
MIGRATION_REPAIR_RUNBOOK_BUILD_4_0_0.md
```

Short version:

1. Create a staging Render PostgreSQL database.
2. Export production tenant JSON and create a Render DB backup.
3. Restore/copy production data into staging.
4. Run `pnpm prisma migrate status` against staging.
5. Resolve or baseline the failed migration on staging only.
6. Run tenant, backup, and forecast tests against staging.
7. Deploy staging with `prisma migrate deploy`.
8. Record all results in `/admin/system`.
9. Only then schedule production migration repair.

## Test commands

```bash
pnpm run build:eval
pnpm run test:forecast
DATABASE_URL="postgres://...staging..." pnpm run test:tenant
DATABASE_URL="postgres://...staging..." pnpm run test:backup
```

`pnpm run build:eval` was run for Build 4.0.0.

The tenant and backup tests require a live staging database and are not considered passed until run against that database.

## Commercial-readiness note

The Data Quality Score is not just an internal admin metric. It is a product differentiator: the app tells the restaurant when its own logging discipline is weakening forecast reliability.

## Known deferred items

- Replace in-memory rate limiting with Redis/Upstash/Postgres-backed limits before scaling beyond one Render instance.
- Switch production to `prisma migrate deploy` only after staging migration repair passes.
- Keep Stripe/billing deferred until there is a real paying prospect ready to onboard.

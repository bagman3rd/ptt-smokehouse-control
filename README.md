# Smokehouse Control — Build 4.4.0

Build 4.4.0 is the operational-fit and commercial-readiness pass. It keeps the Build 4.3.x tenant/security hardening, adds visible trailing-30-day forecast accuracy metrics, EOD local draft recovery, kitchen/mobile/print polish, and starter legal/support/billing surfaces for a first paying-customer path.

## What changed in 4.4.0

- Added trailing 30-day MAPE and accuracy by protein on Learning.
- Added localStorage EOD draft recovery for bad Wi-Fi/failed submits.
- Added mobile-width CSS pass and pit-friendly print CSS.
- Added starter Terms, Privacy, Help, and Billing pages.
- Added Stripe hosted-checkout handoff using `STRIPE_PAYMENT_LINK` or `STRIPE_CHECKOUT_URL`.
- Added uptime monitoring and commercial readiness docs.

- Added GitHub Actions CI: `.github/workflows/ci.yml`.
- CI now runs type-check, lint, forecast tests, permission-boundary tests, dead-code checks, tenant isolation against a Postgres service container, and a Prisma schema drift check.
- Expanded forecast-engine edge-case coverage for zero sales, all-86 proxy data, excess leftovers, min/max clamp collisions, and multiplier extremes.
- Deleted disabled legacy server-action stubs and added a dead-code guard.
- Switched `pnpm run render-build` to the migration-ready path:

```bash
prisma generate && prisma migrate deploy && tsx prisma/seed.ts && next build
```

- Removed the `db:push` package script so normal deploys cannot silently regress to schema drift.
- Added a production/staging migration repair runbook: `MIGRATION_REPAIR_RUNBOOK_BUILD_4_3_1.md`.
- Added backup automation notes and weekly backup runner support.
- Added `scripts/run-weekly-backup-cron.mjs` for Render Cron or another scheduler.
- Added `BACKUP_RESTORE_DRILL_BUILD_4_3_1.md`.
- Updated `/admin/system` to show migration-ready status and critical checks for staging repair, production repair, weekly backups, and restore drills.
- Kept Data Quality Score visible as an operational and sales/demo differentiator.

## Critical deployment warning

Do not deploy Build 4.4.0 to the existing production Render service until the failed Prisma migration state has been repaired or baselined on a staging copy first.

The prior live database had a failed migration record. `prisma migrate deploy` will fail against that database until repaired. The correct sequence is:

1. Take a fresh production backup.
2. Restore the backup to a staging PostgreSQL database.
3. Point a staging web service at that staging database.
4. Run `pnpm run migration:status` against staging.
5. Resolve the failed migration on staging using the runbook.
6. Run:

```bash
pnpm run test:tenant
pnpm run test:forecast
pnpm run test:backup
```

7. Click through the app against staging data.
8. Record passing checks in `/admin/system`.
9. Take a fresh production backup.
10. Repair production during a low-traffic window.
11. Deploy Build 4.4.0 to production.

## Required Render environment variables

```text
DATABASE_URL
ADMIN_PASSWORD
APP_SESSION_TOKEN
NEXT_PUBLIC_APP_NAME
NODE_VERSION=20.18.1
CRON_SECRET
```

Optional for automated backup posting:

```text
BACKUP_POST_URL
BACKUP_APP_URL
```

`BACKUP_APP_URL` should be the app base URL used by `scripts/run-weekly-backup-cron.mjs`, for example:

```text
https://ptt-smokehouse-control.onrender.com
```

## Current Render build command

Keep the external Render build command as:

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --prod=false --frozen-lockfile=false && pnpm run render-build
```

In Build 4.4.0, `pnpm run render-build` runs `prisma migrate deploy`.

## Test commands

```bash
pnpm run build:eval
pnpm run typecheck
pnpm run lint
pnpm run test:forecast
pnpm run test:permissions
pnpm run test:dead-code
pnpm run test:tenant
pnpm run ci:schema-drift
pnpm run test:backup
pnpm run backup:weekly
```

`pnpm run build:eval` is a static project check and was run for Build 4.4.0.

`test:tenant`, `ci:schema-drift`, and `test:backup` require a live PostgreSQL `DATABASE_URL`. GitHub Actions supplies a throwaway Postgres service container for CI; staging still needs to be run separately before production.

## Existing commercial-readiness features

- Daily Operations Command Center: `/today`
- Data Quality Score
- Guided EOD closeout
- Forecast learning with approval and rollback
- Role-based access
- Multi-tenant restaurant model
- Self-service signup: `/signup`
- Prospect demo mode: `/demo`
- POS/sales CSV import with preview: `/admin/restaurants/pos`
- Per-tenant JSON export
- Scheduled backup endpoint: `/api/admin/backups/weekly`
- Admin system readiness tracking: `/admin/system`

## Remaining pre-pilot requirement

Build 4.4.0 is intended to make the migration repair mandatory. The app is pilot-ready only after staging migration repair, tenant tests, backup tests, and a restore drill are completed and recorded.

## Build 4.4.0 Notes

Build 4.4.0 focuses on operational fit and pre-commercial readiness:

- Trailing 30-day forecast accuracy/MAPE by protein on Learning.
- EOD local browser draft recovery for weak Wi-Fi/failed submits.
- Mobile CSS pass for Today and EOD kitchen use.
- Print CSS polish for pit-friendly Cook Plan print view.
- Starter Terms, Privacy, Help, and Billing pages.
- Stripe hosted-checkout handoff through `STRIPE_PAYMENT_LINK` or `STRIPE_CHECKOUT_URL`.
- Uptime monitoring and support-channel docs.

Before the first paying stranger: attorney-review Terms/Privacy, configure Stripe, set `NEXT_PUBLIC_SUPPORT_EMAIL`, enable uptime monitoring, and complete a restore drill.

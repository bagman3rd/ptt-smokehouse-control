# Smokehouse Control — Build 3.8.0

Build 3.8.0 is an operational reliability and commercial-polish build. It adds test-status tracking, restore-drill tracking, setup-completion scoring, POS import preview/confirmation, forecast-change impact review, and a printable daily cook plan while keeping the current Render db-push recovery path.

## What changed in 3.8.0

- Added admin test-status tracking on `/admin/system` for tenant tests, backup tests, forecast tests, restore drills, migration review, and security review.
- Added persistent `SystemCheck` records and backup/tenant export coverage for those records.
- Added setup-completion scoring and setup-blocking warnings to `/admin/restaurants/setup`.
- Added POS/sales CSV import preview and explicit confirmation before data is submitted.
- Added forecast-change impact messaging before learning recommendations are accepted.
- Added printable Cook Plan view at `/cook-plan/print`.
- Expanded audit coverage for login success/failure, report exports, backup exports, and system checks.
- Kept the Render deploy-recovery path using `prisma db push` because the active Render database has a failed migration record. Do not switch production back to `prisma migrate deploy` until the database is repaired/baselined on staging.

## Existing commercial-readiness features

- Self-service signup: `/signup`
- Prospect demo mode with fake operating data: `/demo`
- Generic BBQ starter defaults for new restaurants
- POS/sales-history CSV import: `/admin/restaurants/pos`
- Guided setup wizard with profile, users, sales model, protein specs, curves, and import
- Rate limiting on login, signup, demo, and key API routes
- Zod validation on public/write endpoints
- Per-tenant JSON export and tenant soft delete
- Forecast engine automated tests
- Tenant-isolation and backup/restore drill scripts

## Initial admin login

After deployment, the initial admin user is:

```text
username: admin
password: Render ADMIN_PASSWORD value
```

## Required Render environment variables

```text
DATABASE_URL
ADMIN_PASSWORD
APP_SESSION_TOKEN
NEXT_PUBLIC_APP_NAME
NODE_VERSION=20.18.1
```

`ADMIN_PASSWORD` and `APP_SESSION_TOKEN` must both be at least 12 characters.

## Current Render build command

Keep the external Render build command as:

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --prod=false --frozen-lockfile=false && pnpm run render-build
```

`pnpm run render-build` currently resolves to:

```bash
prisma generate && prisma db push && tsx prisma/seed.ts && next build
```

That is intentional for the active Render database recovery path.

## Migration-ready command, not active yet

After the existing database is baselined and the failed migration is resolved on staging, this command is available:

```bash
pnpm run render-build:migrate-ready
```

Do not use it on the active production database until staging proves it.

## Test commands

```bash
pnpm run build:eval
pnpm run test:forecast
pnpm run test:tenant
pnpm run test:backup
```

`pnpm run build:eval` is a static project check and was run for Build 3.8.0.

`pnpm run test:tenant` and `pnpm run test:backup` require a live staging PostgreSQL `DATABASE_URL`. Run both before adding a real second customer.

## Remaining pre-customer checklist

- Run tenant-isolation and backup/restore tests on staging.
- Repair/baseline Prisma migrations on staging before switching to `prisma migrate deploy`.
- Replace the in-memory rate limiter with Redis or another shared store before scaling beyond one instance.
- Keep billing/Stripe deferred until there is a real paying prospect ready to onboard.


## Build 3.8.0

Pilot Control Center release:

- Added `/admin/system` System Health page.
- Added `/admin/smokers` smoker-capacity setup.
- Added dashboard smoker-capacity warnings.
- Added Learning recommendation review queue with accept/reject decisions.
- Expanded audit logging for settings changes and learning decisions.
- Kept Render on `prisma db push` recovery mode; do not switch back to `migrate deploy` until staging migration baseline is complete.


## Build 3.8.0 Notes

Build 3.8.0 adds controlled learning updates:

- Accepted learning recommendations can update settings after Admin/Owner confirmation.
- The Learning page now shows before/after previews, confidence levels, minimum sample-size thresholds, forecast accuracy, and rollback controls.
- Applied recommendation decisions are audit logged with before/after values.
- Cook Plan creation now shows smoker-capacity warnings before the plan is generated.
- The build remains in db-push recovery mode until migration baselining is repaired on staging.

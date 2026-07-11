# Smokehouse Control — Build 3.5.0

Build 3.5.0 is a cleanup and operational-hardening build after the 3.4.1 deploy-recovery release.

## What changed in 3.5.0

- Fixed the README/package.json mismatch. The package version, README, nav badge, backup export metadata, and evaluation script now all agree on Build 3.5.0.
- Kept the Render deploy-recovery path using `prisma db push` because the active Render database has a failed migration record. Do not switch production back to `prisma migrate deploy` until the database is repaired/baselined on staging.
- Removed the unused tenant helper functions `tenantWhere()` and `tenantOrLegacyWhere()` from `lib/tenant.ts`. The app now has one clear tenant-scoping pattern: explicit `restaurantId` filtering tied to the active restaurant context.
- Added an operational note for the in-memory rate limiter. It is acceptable for one Render instance, but a Redis-backed limiter should replace it before horizontal scaling.
- Clarified that `test:tenant` and `test:backup` must be run against a real staging `DATABASE_URL`; static evaluation only proves the scripts exist and the code path is wired.

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

`pnpm run build:eval` is a static project check and was run for Build 3.5.0.

`pnpm run test:tenant` and `pnpm run test:backup` require a live staging PostgreSQL `DATABASE_URL`. Run both before adding a real second customer.

## Remaining pre-customer checklist

- Run tenant-isolation and backup/restore tests on staging.
- Repair/baseline Prisma migrations on staging before switching to `prisma migrate deploy`.
- Replace the in-memory rate limiter with Redis or another shared store before scaling beyond one instance.
- Keep billing/Stripe deferred until there is a real paying prospect ready to onboard.

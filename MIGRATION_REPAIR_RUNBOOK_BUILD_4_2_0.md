# Migration Repair Runbook — Build 4.2.0

Build 4.2.0 switches normal deploys back to `prisma migrate deploy`. Do not run it against production until this runbook has passed on a staging copy.

## Why this matters

The live Render database previously had a failed Prisma migration record. Running `prisma migrate deploy` against a database with a failed migration record returns Prisma P3009 and stops deployment. Build 4.2.0 removes the db-push recovery path, so the failed migration must be resolved or baselined first.

## Phase 1 — Create staging copy

1. Take a fresh production database backup.
2. Create a new Render PostgreSQL staging database.
3. Restore the production backup into staging.
4. Deploy a staging web service pointed at staging `DATABASE_URL`.
5. Set staging environment variables:

```text
DATABASE_URL
ADMIN_PASSWORD
APP_SESSION_TOKEN
NEXT_PUBLIC_APP_NAME
NODE_VERSION=20.18.1
CRON_SECRET
```

## Phase 2 — Inspect migration state on staging

Run against staging:

```bash
pnpm install
pnpm run prisma:generate
pnpm run migration:status
```

If Prisma reports a failed migration, inspect the migration name and failure time.

## Phase 3A — Resolve the failed migration if schema already matches

Use this when the failed migration's schema changes are already present in the database.

```bash
pnpm exec prisma migrate resolve --applied <failed_migration_name>
pnpm run migration:status
pnpm run render-build
```

Then run:

```bash
pnpm run test:tenant
pnpm run test:forecast
pnpm run test:backup
```

## Phase 3B — Re-baseline if migration history is unusable

Use only on staging first.

1. Confirm the current database schema matches `prisma/schema.prisma` closely enough to preserve app data.
2. Generate a baseline SQL script:

```bash
pnpm run migration:baseline:check > baseline.sql
```

3. Create a new baseline migration in `prisma/migrations` if needed.
4. Mark the baseline as applied using Prisma migration resolve.
5. Run:

```bash
pnpm run migration:status
pnpm run render-build
pnpm run test:tenant
pnpm run test:forecast
pnpm run test:backup
```

## Phase 4 — Click-test staging

Verify:

- Login
- Today page
- Dashboard
- Cook Plan
- End of Day
- Reports
- Learning
- Settings
- Users
- Restaurants
- System
- Tenant export
- Weekly backup endpoint

Record PASS checks in `/admin/system`.

## Phase 5 — Production repair

Only after staging passes:

1. Schedule a low-traffic window.
2. Take a fresh production backup immediately before changes.
3. Run the same successful staging repair path on production.
4. Run `pnpm run migration:status` against production.
5. Deploy Build 4.2.0.
6. Verify app boot/login and record `PRODUCTION_MIGRATION_REPAIR` as PASS in `/admin/system`.

## Stop conditions

Stop immediately if:

- Record counts change unexpectedly.
- Tenant isolation test fails.
- Backup test fails.
- `prisma migrate status` shows unresolved failures after repair.
- The app does not boot on staging.

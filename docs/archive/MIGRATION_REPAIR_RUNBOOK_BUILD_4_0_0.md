# Build 4.2.0 Migration Repair Runbook

## Purpose

The live Render database has a failed Prisma migration record and the app is intentionally deploying in `prisma db push` recovery mode. That is acceptable for a controlled pilot, but it should not remain in place once PTT starts producing operating data that cannot be casually discarded.

This runbook is the step-by-step staging exercise required before switching production back to `prisma migrate deploy`.

## Current safe production posture

Current `render-build` remains:

```bash
prisma generate && prisma db push && tsx prisma/seed.ts && next build
```

It intentionally does **not** use:

```bash
--accept-data-loss
```

Do not change production to `prisma migrate deploy` until this runbook has passed on a staging copy.

## Step 1 — Create a staging database

Create a new Render PostgreSQL database, for example:

```text
ptt-smokehouse-control-staging
```

Do not use the production database for the first repair attempt.

## Step 2 — Export production data

From the app, use:

```text
Reports → Download full data backup JSON
```

Also create a Render PostgreSQL backup/snapshot if available.

Record the export in:

```text
/admin/system → Backup export test
```

## Step 3 — Restore/copy production into staging

Restore the Render PostgreSQL backup into staging, or use a controlled `pg_dump` / `pg_restore` workflow.

After restore, point local/staging environment to the staging URL only:

```bash
export DATABASE_URL="postgres://...staging..."
```

## Step 4 — Inspect Prisma migration state

Run:

```bash
pnpm install
pnpm prisma migrate status
```

Expected current problem: Prisma may report failed migration state, such as `P3009`.

## Step 5 — Decide repair path

Use one of these paths on staging only:

### Preferred path: mark failed migration resolved if schema already matches

If the staging database schema already matches the current Prisma schema, mark the failed migration as applied:

```bash
pnpm prisma migrate resolve --applied 20260709012200_init
```

Then run:

```bash
pnpm prisma migrate status
```

### Alternate path: create clean baseline from current schema

If the migration history is too damaged, create a clean baseline migration in a temporary branch and validate against staging before using it for production.

## Step 6 — Validate schema parity

Run:

```bash
pnpm prisma migrate status
pnpm prisma generate
pnpm run test:forecast
DATABASE_URL="postgres://...staging..." pnpm run test:tenant
DATABASE_URL="postgres://...staging..." pnpm run test:backup
```

All must pass before production repair.

## Step 7 — Perform restore drill

Use the exported JSON and/or database backup to prove you can reconstruct critical data.

Verify at minimum:

```text
Restaurant count
User count
Protein count
Cook plan count
EOD log count
Report/export count
Audit log count
Smoker count
System check count
Learning recommendation count
```

Record result in:

```text
/admin/system → Backup restore drill
```

## Step 8 — Rehearse migration deploy on staging

Change staging build command only:

```bash
prisma generate && prisma migrate deploy && tsx prisma/seed.ts && next build
```

Deploy staging. Confirm it boots and login works.

## Step 9 — Production change window

After staging passes:

1. Announce a short maintenance window.
2. Export production tenant backup JSON.
3. Create Render DB backup.
4. Run the same migration repair action against production.
5. Deploy using `prisma migrate deploy`.
6. Verify login, Today, Cook Plan, EOD, Reports, Learning, Backup Export.
7. Record the production migration baseline review in `/admin/system`.

## Do not proceed if

- Staging tenant isolation test fails.
- Staging backup restore drill is not verified.
- `prisma migrate status` reports failed migrations after repair.
- Render staging cannot deploy with `migrate deploy`.
- Production backup/export has not been captured immediately before repair.

## Rollback posture

If production repair fails:

1. Keep production app on last known deployed build.
2. Restore from Render database backup if needed.
3. Revert render-build to db-push recovery mode.
4. Do not continue schema work until staging failure is understood.

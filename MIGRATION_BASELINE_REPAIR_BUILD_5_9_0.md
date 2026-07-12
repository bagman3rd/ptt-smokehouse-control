# Build 5.9.0 — Migration Baseline Repair

## What was wrong

The original `20260712000100_build_330_baseline/migration.sql` was an empty placeholder. That meant a fresh PostgreSQL database could not be rebuilt from the repository with `prisma migrate deploy`.

That is now fixed. The baseline migration contains the full current schema through Build 5.9.0, including Restaurants, users, tenant records, cook plans, EOD logs, smokers, smoker catalog, SaaS billing/support/data-request tables, and POS import tables.

## What changed

- Replaced the empty baseline with full `CREATE TYPE`, `CREATE TABLE`, index, and core foreign-key DDL.
- Removed the emergency `migrate resolve --rolled-back ... || true` command from `render-build`.
- Removed `prisma db push` from CI.
- CI now applies migrations against a clean Postgres database with `prisma migrate deploy`.
- CI then runs `prisma migrate status` and the schema drift check.
- Added `pnpm run test:migration-integrity` so the empty baseline cannot silently return.

## Existing production database rule

Do not run the full baseline against an existing production database that already has tables. Existing databases should have the baseline migration marked applied in `_prisma_migrations` before deploying this build.

Production was previously manually baselined. If Render reports a checksum/history error for `20260712000100_build_330_baseline`, use this process:

1. Create a fresh Render PostgreSQL export first.
2. Open the web service Shell.
3. Check status:

```bash
npx prisma migrate status
```

4. If the only problem is that the already-applied baseline checksum differs from the repaired file, update the baseline record intentionally after backup review. Do not delete application tables.

The safer long-term path is to test Build 5.9.0 first on a staging database restored from production, then promote to production.

## Fresh database verification

For a true fresh database, this must work:

```bash
pnpm install --frozen-lockfile=false
pnpm run prisma:generate
pnpm run prisma:migrate
pnpm run ci:migration-status
pnpm run ci:schema-drift
```

That is now the same migration path CI uses.

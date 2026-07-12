# Smokehouse Control — Build 5.9.0

Build 5.9.0 is a **DevOps/database-integrity repair build**. It fixes the broken empty migration baseline, removes `prisma db push` from CI, and forces CI to rebuild a fresh PostgreSQL database with `prisma migrate deploy`.

## Critical Build 5.9.0 changes

- Full-schema baseline in `prisma/migrations/20260712000100_build_330_baseline/migration.sql`
- CI now applies migrations to a clean Postgres database with `pnpm run prisma:migrate`
- CI no longer uses `prisma db push`
- Render build is now a plain migration deploy path:

```bash
prisma generate && prisma migrate deploy && tsx prisma/seed.ts && next build
```

- Added migration integrity test:

```bash
pnpm run test:migration-integrity
```

## Production warning

Existing production databases that already have the old empty baseline marked applied should not execute the repaired baseline against existing tables. Test this build against staging first. See:

```text
MIGRATION_BASELINE_REPAIR_BUILD_5_9_0.md
MIGRATION_HISTORY_LOCK_BUILD_5_9_0.md
```

## Deploy commit message

```text
Build 5.9.0 migration baseline and CI repair
```

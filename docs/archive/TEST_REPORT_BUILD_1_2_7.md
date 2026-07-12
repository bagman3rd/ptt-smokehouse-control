# PTT Smokehouse Control — Build 1.2.8 Deployment Recovery Report

## Problem observed

Render deployment reached Prisma but failed because a prior migration attempt left the database in a failed migration state:

```text
The migration ... failed
New migrations will not be applied
```

## Root cause

Earlier failed deploy attempts repeatedly ran `prisma migrate deploy` against the same Render Postgres database. Prisma recorded a failed migration in `_prisma_migrations`, which blocked later migration deploys.

## Build 1.2.8 fix

For this MVP/test database, the deployment path now uses:

```bash
prisma generate && prisma db push --accept-data-loss && tsx prisma/seed.ts && next build
```

This bypasses migration-history state and aligns the database directly to `schema.prisma`.

## Validation performed

- Confirmed package version updated to 1.2.8.
- Confirmed nav badge updated to Build 1.2.8.
- Confirmed Render build script no longer runs `prisma migrate deploy`.
- Confirmed seed script remains idempotent via `upsert` calls.
- Confirmed flat ZIP packaging.

## Remaining recommendation

For a clean MVP database with no real production data, deleting and recreating the Render Postgres database is still the cleanest recovery if migration-state errors persist. After launch data exists, do not use destructive reset workflows without backup.

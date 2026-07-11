# Migration Baseline Plan — Build 3.2.0

Build 3.2.0 still keeps the production Render build on `prisma db push` because the current hosted database was evolved through `db push` during MVP development. Switching directly to `prisma migrate deploy` without baselining can strand the deployment.

## Added in this build

- `pnpm run migration:baseline:check` generates a SQL diff from an empty database to the current Prisma schema.
- `pnpm run render-build:migrate-ready` is available but intentionally not used by Render yet.
- `pnpm run test:tenant` runs the Postgres tenant-isolation integration test against `DATABASE_URL`.

## Safe cutover sequence before real customer data

1. Export a full JSON backup from Reports.
2. Export a database backup from Render.
3. Create a staging PostgreSQL database.
4. Restore current production data into staging.
5. Generate an initial Prisma migration from the current schema.
6. Mark the migration as applied in staging with `prisma migrate resolve --applied`.
7. Run `pnpm run test:tenant` against staging.
8. Run `pnpm run render-build:migrate-ready` against staging.
9. Only after that, update Render production build command from `db push` to `migrate deploy`.

## Do not do this yet

Do not point production Render at `prisma migrate deploy` until the existing database has been baselined and a staging deploy has passed.

# Build 3.3.0 Migration Deploy Plan

Build 3.3.0 changes the Render build command from `prisma db push` to `prisma migrate deploy`.

## Why

Multi-customer use requires tracked migrations, reviewable schema history, and a rollback/recovery path. `db push` is too risky once multiple tenants have live operating history.

## Current status

This build includes a no-op baseline migration because the existing Render database was created through `db push` across earlier MVP builds.

## Safe rollout

1. Clone production DB to staging.
2. Deploy Build 3.3.0 to staging.
3. If the baseline is not marked applied, run:
   ```bash
   pnpm prisma migrate resolve --applied 20260712000100_build_330_baseline
   ```
4. Run:
   ```bash
   pnpm prisma migrate deploy
   pnpm run test:tenant
   pnpm run test:forecast
   ```
5. Only then deploy to production.

## Rule going forward

Every schema change after Build 3.3.0 should have a real migration file and should be tested on staging before production.

# Build 6.3.3 — Non-null Tenant Seed Compile Fix

Build 6.3.3 fixes the Prisma compile failure caused by legacy seed and bootstrap queries that filtered non-null tenant columns with `restaurantId: null`.

## Changes

- Removed invalid null filters for `Protein`, `CookPlan`, and `EndOfDayLog` from `prisma/seed.ts`.
- Removed the same invalid filters from `lib/bootstrap.ts`.
- Retained legacy backfill only for models whose tenant ownership is still nullable.
- Reworked the orphan-record check to use SQL, allowing it to verify both nullable and non-null tenant columns.
- Updated build labels, health endpoints, CI, and release checks to 6.3.3.

No schema migration or production data change is included.

# Build 6.7.2 — Render Prisma Generation Fix

## Problem corrected
Render could execute the standard `pnpm build` command with a cached Prisma Client generated before the Build 6.7.0 POS models existed. TypeScript then reported that `prisma.posConnection` did not exist even though `PosConnection` was present in `prisma/schema.prisma`.

## Fix
- Added `prebuild: prisma generate` to `package.json`.
- Every standard `pnpm build` now regenerates Prisma Client before `next build`.
- Retained the migration-safe `render-build` command using `prisma migrate deploy`.
- Updated health checks and release identifiers to Build 6.7.2.
- Preserved all Build 6.7.1 integer sealed-inventory validation and Build 6.7.0 POS functionality.

## Render configuration
Preferred build command: `pnpm run render-build`

The standard `pnpm build` command is now also safe from stale Prisma Client types, but it does not deploy database migrations.

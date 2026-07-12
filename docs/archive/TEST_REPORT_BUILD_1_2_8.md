# PTT Smokehouse Control — Build 1.2.8 Test Report

## Purpose
Build 1.2.8 is a Render recovery build. It removes Prisma migration files from the deploy package and uses `prisma db push --accept-data-loss` instead of `prisma migrate deploy` for MVP schema sync.

## Fixes
- Removed `prisma/migrations/` from the ZIP.
- `render-build` does not call `prisma migrate deploy`.
- `render-build` runs: `prisma generate && prisma db push --accept-data-loss && tsx prisma/seed.ts && next build`.
- Keeps auto-seeding/scenario self-healing.
- App badge updated to Build 1.2.8.

## Deployment test expectations
Render build should show:
1. `pnpm install`
2. `prisma generate`
3. `prisma db push`
4. `tsx prisma/seed.ts`
5. `next build`

It should not show `prisma migrate deploy` or `2 migrations found in prisma/migrations`.

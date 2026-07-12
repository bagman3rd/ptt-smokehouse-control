# Smokehouse Control — Build 4.6.0

Build 4.6.0 is the staging verification and database-integrity build.

The main purpose is to close the gap between:

```text
The test exists.
```

and:

```text
The test passed against a real staging PostgreSQL database and was recorded.
```

## What changed in 4.6.0

- Added `STAGING_VERIFICATION_BUILD_4_6_0.md`.
- Added `DATABASE_INTEGRITY_RUNBOOK_BUILD_4_6_0.md`.
- Added `scripts/staging-verification-check.mjs`.
- Added package script `pnpm run staging:verify`.
- Updated `/admin/system` with staging proof checks:
  - Staging migration status
  - Staging tenant isolation test
  - Staging cross-tenant regression test
  - Staging forecast test
  - Staging backup export test
  - Staging app click-through
  - Staging restore drill
  - Production migration status
- Kept Render on the correct long-term build path:

```bash
prisma generate && prisma migrate deploy && tsx prisma/seed.ts && next build
```

- Confirmed the app must not use:

```bash
prisma db push
--accept-data-loss
```

## Standard deploy command on Render

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --prod=false --frozen-lockfile=false && pnpm run render-build
```

## Required staging commands before outside customers

Run these against a real staging database:

```bash
npx prisma migrate status
pnpm run test:tenant
pnpm run test:cross-tenant
pnpm run test:forecast
pnpm run test:backup
pnpm run test:permissions
pnpm run staging:verify
```

Then record the results in `/admin/system`.

## Important note

Build 4.6.0 does not claim staging has passed. It gives you the controls and documentation to run and record those checks.

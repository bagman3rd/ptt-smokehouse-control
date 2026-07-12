# Smokehouse Control — Build 4.5.0

Build 4.5.0 is the deploy-stability and TypeScript-cleanup build. Its purpose is to stop surprise Render compile failures by making type-check, lint, preflight, CI, and version consistency mandatory before shipping a ZIP.

## What changed in 4.5.0

- Added `scripts/preflight-build-check.mjs`.
- Added `pnpm run preflight` package script.
- Updated GitHub Actions to run preflight before type-check/lint/tests.
- Confirmed `render-build` uses `prisma migrate deploy`, not `prisma db push`.
- Confirmed package scripts do not use `--accept-data-loss`.
- Updated package version, nav badge, docs, and build evaluation to Build 4.5.0.
- Preserved prior operational-fit functionality: mobile/kitchen pass, local EOD draft save, print polish, billing/legal/help pages, forecast proof metrics, and commercial-readiness scaffolding.
- Preserved Build 4.3.x hardening: tenant guard, cross-tenant tests, Postgres-backed rate limiting, account lockout, and session revocation.

## Required deploy flow

Normal build/deploy path:

1. Download ZIP from ChatGPT.
2. Extract ZIP.
3. Copy all files from the ZIP root.
4. Paste into the local `ptt-smokehouse-control` repo folder.
5. Replace files.
6. Open GitHub Desktop.
7. Commit to `main`.
8. Push origin.
9. Confirm GitHub Actions starts.
10. Confirm CI passes or send the red-X error back for repair.
11. Render → Manual Deploy → Clear build cache & deploy.

Do not use Render Shell for normal builds. Shell is only for emergency database commands or migration repair.

## Build checks

Package scripts include:

```bash
pnpm run preflight
pnpm run typecheck
pnpm run lint
pnpm run build
pnpm run test:forecast
pnpm run test:permissions
pnpm run test:account-security
pnpm run test:tenant
pnpm run test:cross-tenant
pnpm run ci:schema-drift
```

GitHub Actions runs the important checks on every push / pull request using a Postgres service container.

## Render build command

Use the same Render build command:

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate && pnpm install --prod=false --frozen-lockfile=false && pnpm run render-build
```

`pnpm run render-build` runs:

```bash
prisma generate && prisma migrate deploy && tsx prisma/seed.ts && next build
```

It does not use `prisma db push` and does not use `--accept-data-loss`.

## Important production database note

The production database migration baseline was manually repaired after the failed legacy Prisma migration record. Before relying on this for live pilot operations, verify in Render Shell:

```bash
npx prisma migrate status
```

Expected result:

```text
Database schema is up to date!
```

## Build 4.5.0 notes

This build is about discipline, not new BBQ features. The BBQ logic, reporting, learning, EOD workflow, smoker capacity, and commercial-readiness pages are preserved from earlier builds. The improvement is that future builds should fail earlier in CI/preflight instead of surprising you during Render deployment.

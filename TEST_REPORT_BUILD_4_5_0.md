# TEST REPORT — Build 4.6.0

## Scope

Build 4.6.0 focuses on deploy stability, TypeScript cleanup discipline, preflight checks, and CI enforcement.

## Static checks performed in this environment

- Verified package version is `4.6.0`.
- Verified nav badge shows `Build 4.6.0`.
- Verified README references Build 4.6.0.
- Added `scripts/preflight-build-check.mjs`.
- Added `pnpm run preflight`.
- Updated GitHub Actions to run preflight before typecheck/lint/tests.
- Verified `render-build` uses `prisma migrate deploy`.
- Verified `render-build` does not use `prisma db push`.
- Verified package scripts do not include `--accept-data-loss`.
- Verified baseline migration folder is present.

## Not run in this sandbox

The full dependency-backed commands require installed project packages and/or a live Postgres service container, so they must run in GitHub Actions or a local dev environment:

```bash
pnpm run typecheck
pnpm run lint
pnpm run build
pnpm run test:tenant
pnpm run test:cross-tenant
pnpm run ci:schema-drift
```

## Expected CI behavior

After pushing Build 4.6.0 to GitHub, the Actions tab should run:

- preflight
- typecheck
- lint
- forecast tests
- permission tests
- account-security tests
- dead-code check
- tenant integration test against Postgres service container
- cross-tenant regression test
- schema drift check

If any check fails, the red-X GitHub Actions output is the next repair target before redeploying to Render.

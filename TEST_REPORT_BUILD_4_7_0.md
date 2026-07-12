# Build 4.7.0 Test Report

## Static checks completed in build environment

- Version references updated to 4.7.0.
- README/package/nav alignment verified by preflight script.
- Tenant guard coverage script added.
- Orphan record check script added.
- CI workflow updated to run tenant guard and orphan checks.
- Prisma schema includes tenant indexes and composite uniqueness.
- Build 4.7.0 evaluation script passed.

## Tests that still require live/staging database

- `pnpm run test:tenant`
- `pnpm run test:cross-tenant`
- `pnpm run test:orphan-records`
- `pnpm run ci:schema-drift`

These must be run against staging before onboarding unrelated restaurants.

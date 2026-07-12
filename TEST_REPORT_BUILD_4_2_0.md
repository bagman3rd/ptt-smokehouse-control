# Test Report — Build 4.2.0

## Build theme

Code Quality & Testing: move tests into CI, expand forecast edge coverage, add permission-boundary checks, remove dead code, and add a Prisma drift check.

## Added / changed

- Added `.github/workflows/ci.yml`.
- Added `typecheck` script.
- Added ESLint config and ESLint dependencies.
- Added `test:permissions`.
- Added `test:dead-code`.
- Added `ci:schema-drift` using `prisma migrate diff`.
- Expanded `test:forecast` with production-risk edge cases.
- Deleted disabled legacy `createCookPlan()` and `saveEndOfDayLog()` server-action stubs.
- Updated app version and badge to Build 4.2.0.

## Static evaluation

`node scripts/build-4-2-0-evaluation.mjs`

Result:

```text
Build 4.2.0 evaluation checks completed.
```

## CI workflow coverage

The GitHub Actions workflow runs on push and pull request and includes:

- Install dependencies.
- Prisma generate.
- TypeScript type-check.
- Lint.
- Forecast tests.
- Permission-boundary tests.
- Dead-code check.
- Throwaway Postgres schema setup.
- Tenant isolation integration test.
- Prisma schema drift check.

## Important limitation

This local sandbox cannot execute the full GitHub Actions workflow because dependency installation and a live CI Postgres service are not available here. The workflow is included in the repository and should run on GitHub after push.

## Production note

Build 4.2.0 still assumes the migration-repair path from Build 4.1.0: production should not be moved forward until staging migration repair, tenant tests, and restore drill pass.

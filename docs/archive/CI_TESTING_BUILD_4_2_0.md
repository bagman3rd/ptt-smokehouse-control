# Build 4.2.0 CI / Testing Notes

Build 4.2.0 moves core protection tests into GitHub Actions so they run on every push and pull request.

## GitHub Actions workflow

Added:

```text
.github/workflows/ci.yml
```

The workflow runs:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test:forecast
pnpm run test:permissions
pnpm run test:dead-code
pnpm exec prisma db push --skip-generate
pnpm run test:tenant
pnpm run ci:schema-drift
```

## Postgres service container

CI starts a throwaway Postgres 16 container and uses it for the tenant isolation integration test.

This does not replace staging. It catches ordinary tenant-isolation regressions on every push. Staging is still required before production deployment.

## Forecast edge cases covered

The forecast test now covers:

- Zero annual sales.
- Extreme day/month/event multipliers.
- Confidence thresholds.
- Rack-based rib logic.
- Breast-based chicken leftover reduction.
- Leftover credit exceeding forecast.
- Minimum/maximum clamp collisions.
- Maximum cook-unit cap under extreme demand.
- All-86 / zero-sales proxy case.

## Permission-boundary tests

Added:

```bash
pnpm run test:permissions
```

This static test verifies high-risk role boundaries, including:

- Kitchen Crew cannot approve cook plans.
- Kitchen Crew cannot generate cook plans.
- Settings are Admin/Owner only.
- Backup export is Admin/Owner only.
- Tenant export/delete are Admin/Owner only.
- Kitchen Crew keeps End-of-Day write access.

## Dead-code checks

Added:

```bash
pnpm run test:dead-code
```

This checks that retired tenant helper names and disabled legacy server-action stubs do not remain in the codebase.

## Prisma schema drift check

Added:

```bash
pnpm run ci:schema-drift
```

This uses `prisma migrate diff` against the CI database after schema preparation. It is designed to catch schema mismatch in review instead of at Render deploy time.

## Still required before production

- Run staging database migration repair.
- Run staging tenant/backup/forecast tests against a restored production copy.
- Complete one restore drill and record it as a passing SystemCheck.

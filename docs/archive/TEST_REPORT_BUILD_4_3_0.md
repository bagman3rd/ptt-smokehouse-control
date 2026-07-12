# Test Report — Build 4.3.3

## Static checks performed in this build

- Build version updated to `4.3.3`.
- `render-build` remains on `prisma migrate deploy` and does not use `prisma db push` or `--accept-data-loss`.
- Postgres-backed `RateLimitBucket` model added.
- User lockout/session revocation fields added.
- Session cookies now include `sessionVersion` and are invalidated after password reset/deactivation.
- Login failures increment per-user counters and can lock the account.
- Admin Users page surfaces lockout status and failed-login count.
- Prisma tenant guard extension added to throw in development/test when tenant-scoped model queries omit `restaurantId`.
- CI workflow includes forecast, permission, account-security, tenant, cross-tenant, dead-code, and schema-drift checks.

## Scripts added/updated

```bash
pnpm run test:account-security
pnpm run test:cross-tenant
pnpm run test:tenant
pnpm run test:forecast
pnpm run test:permissions
pnpm run ci:schema-drift
```

## Local static verification completed

```text
Build 4.3.3 account-security checks completed.
Build 4.3.3 evaluation checks completed.
```

## External staging verification still required

The live staging database test must be run against an actual staging `DATABASE_URL` after deploy:

```bash
pnpm run test:tenant
pnpm run test:cross-tenant
pnpm run test:forecast
pnpm run test:backup
```

Record a passing SystemCheck after this is run on staging. The code now includes the test coverage, but the external staging execution is an operational step.

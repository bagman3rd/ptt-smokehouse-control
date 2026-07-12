# Build 4.6.0 — Staging Verification and Database Integrity

Build 4.6.0 is the database-integrity verification build. The goal is to move from "the tests exist" to "the tests were run against a real staging PostgreSQL database and recorded."

## Required staging sequence

1. Create or confirm a separate Render PostgreSQL database for staging.
2. Restore/copy production data into staging, or use a representative staging dataset.
3. Create or duplicate a staging Render web service.
4. Set staging `DATABASE_URL` to the staging database, not production.
5. In the staging service shell, run:

```bash
npx prisma migrate status
pnpm run test:tenant
pnpm run test:cross-tenant
pnpm run test:forecast
pnpm run test:backup
pnpm run test:permissions
pnpm run staging:verify
```

6. Click through staging:

```text
/login
/today
/dashboard
/cook-plan
/end-of-day
/reports
/learning
/settings
/admin/system
```

7. In `/admin/system`, record PASS checks for:

```text
STAGING_MIGRATION_STATUS
STAGING_TENANT_TEST
STAGING_CROSS_TENANT_TEST
STAGING_FORECAST_TEST
STAGING_BACKUP_TEST
STAGING_CLICK_TEST
STAGING_RESTORE_DRILL
```

## Production gate

Do not treat the app as commercial-ready until these are true:

- Production database migration status is clean.
- Staging migration status is clean.
- Tenant isolation tests pass against staging.
- Cross-tenant regression tests pass against staging.
- Forecast tests pass.
- Backup export test passes.
- At least one restore drill has been completed and recorded.

## Render build mode

Build 4.6.0 stays on the correct production path:

```bash
prisma generate && prisma migrate deploy && tsx prisma/seed.ts && next build
```

It must not regress to `prisma db push` or `--accept-data-loss`.

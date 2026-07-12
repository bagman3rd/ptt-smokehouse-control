# Test Report — Build 5.9.0

## Focus

Build 5.9.0 is a DevOps/database-integrity repair build. It intentionally adds no user-facing feature work.

## Static tests run in this sandbox

- `node scripts/build-5-9-0-evaluation.mjs`
- `node scripts/migration-integrity-test.mjs`
- `node scripts/preflight-build-check.mjs`
- `node scripts/smoker-catalog-test.mjs`
- `node scripts/generate-plan-regression-test.mjs`
- `node scripts/account-security-test.mjs`
- `node scripts/dead-code-check.mjs`
- `node scripts/permission-boundary-test.mjs`
- `node scripts/tenant-guard-coverage-test.mjs`
- `node scripts/pos-import-mapping-test.mjs`
- `node scripts/demo-docs-test.mjs`
- `node scripts/staging-verification-check.mjs`

## Checks added

- Baseline migration must contain full-schema `CREATE TABLE` statements.
- CI must not use `prisma db push`.
- CI must use `prisma migrate deploy` against fresh Postgres.
- Render build must not hide migration failures with `migrate resolve ... || true`.
- Duplicate legacy timestamp prefixes must be explicitly documented.

## Full migration validation still required

The sandbox does not include a running PostgreSQL service or installed node modules. GitHub Actions must perform the true migration test against the Postgres service using `pnpm run prisma:migrate`.

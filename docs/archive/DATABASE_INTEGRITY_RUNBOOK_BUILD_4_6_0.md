# Database Integrity Runbook — Build 4.6.0

## What good looks like

`npx prisma migrate status` should report that the database schema is up to date. If it reports failed or missing migrations, do not deploy a new production build until staging repair is complete.

## Minimum commands

```bash
npx prisma migrate status
pnpm run ci:schema-drift
pnpm run test:tenant
pnpm run test:cross-tenant
pnpm run test:forecast
pnpm run test:backup
```

## Recording proof

After each command succeeds against staging, record it on `/admin/system` as a SystemCheck. The key distinction is:

```text
Script exists != Script passed against staging.
```

Build 4.6.0's purpose is to make the second fact visible.

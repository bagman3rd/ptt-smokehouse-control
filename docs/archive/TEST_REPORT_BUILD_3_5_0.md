# Test Report — Build 3.5.0

## Purpose

Build 3.5.0 addresses operational cleanup after Build 3.4.1:

- Package/README/version alignment
- Removal of unused tenant helper functions
- Explicit staging-test notes
- Explicit in-memory rate-limiter scaling note
- Confirmation that the active Render path remains `prisma db push` until migration repair/baseline work is complete

## Static checks run

```bash
node scripts/build-3-5-0-evaluation.mjs
```

Result:

```text
Build 3.5.0 evaluation checks completed.
```

## Checks covered

- `package.json` version is `3.5.0`.
- `build:eval` points to the Build 3.5.0 evaluator.
- Navigation badge shows Build 3.5.0.
- README title and package version match.
- README accurately states that the current Render path uses `prisma db push`, not active `migrate deploy`.
- README documents that tenant and backup tests require staging Postgres.
- `tenantWhere()` and `tenantOrLegacyWhere()` were removed from `lib/tenant.ts`.
- Render build does not use `--accept-data-loss`.
- Render build does not use `prisma migrate deploy` until failed migration state is repaired.
- Backup/export metadata uses Build 3.5.0.
- Rate-limit scaling note exists.

## Not run here

These require a live staging database and were not executed in this sandbox:

```bash
pnpm run test:tenant
pnpm run test:backup
```

Run them against staging before adding any outside customer.

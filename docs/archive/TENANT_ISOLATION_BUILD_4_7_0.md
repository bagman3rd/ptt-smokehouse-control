# Build 4.7.0 Tenant Isolation Hardening

## Purpose

Build 4.7.0 moves tenant safety from "remember to add restaurantId" toward structural enforcement.

## Changes

1. Expanded Prisma tenant guard coverage.
2. Added `restaurantId` to CookPlanItem and EndOfDayProteinLog.
3. Added tenant-level composite uniqueness and indexes.
4. Added cross-tenant and tenant-guard CI checks.
5. Added orphan-record check for staging/CI.

## Required staging verification

Run against staging PostgreSQL:

```bash
pnpm run test:tenant
pnpm run test:cross-tenant
pnpm run test:tenant-guard
pnpm run test:orphan-records
pnpm run ci:schema-drift
```

Record the pass in `/admin/system` as:

- Staging tenant isolation test
- Staging cross-tenant test
- Staging migration status
- Staging app click-through

## Remaining risk

Composite unique indexes can fail if old duplicated records exist. If so, export first, dedupe the relevant tenant's duplicate rows, then rerun migrate deploy.

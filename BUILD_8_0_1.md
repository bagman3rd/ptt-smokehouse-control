# Build 8.0.2 — Recoverable POS Foundation Migration

Build 8.0.2 fixes the Render deployment failure caused by a partially existing `PosConnection` relation.

## Root cause

The production database already contained at least part of the Build 8.0.0 POS schema. Prisma recorded migration `20260712001500_build_800_pos_integration_foundation` as failed when its unconditional `CREATE TABLE "PosConnection"` encountered the existing relation.

## Correction

- POS enum creation now tolerates existing enum types.
- All POS table and index creation is idempotent.
- Foreign-key creation remains duplicate-safe.
- Render runs a narrowly scoped recovery script before `prisma migrate deploy`.
- The recovery script only marks the named failed POS migration rolled back, then Prisma reruns it.
- Fresh databases still apply the same migration normally.

No tables are dropped and no existing POS data is deleted.

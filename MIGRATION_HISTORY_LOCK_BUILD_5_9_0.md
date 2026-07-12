# Build 5.9.1 — Migration History Lock

Some earlier migration folders share timestamp prefixes. They are preserved because renaming or deleting migration folders that may already be recorded in production `_prisma_migrations` can create a worse migration-history mismatch.

The preserved legacy duplicate prefixes are:

- `20260712000400`
  - `20260712000400_build_480_security_hardening`
  - `20260712000400_build_530_pos_integration`
- `20260712000500`
  - `20260712000500_build_520_commercial_saas`
  - `20260712000500_build_550_smoker_catalog`
- `20260712000600`
  - `20260712000600_build_570_official_smoker_catalog`
  - `20260712000600_build_580_smoker_catalog_units`

Policy from Build 5.9.1 forward:

1. Do not reuse timestamp prefixes for new migrations.
2. Do not rename already-shipped migration folders without a production migration-history repair plan.
3. CI must rebuild a fresh database with `prisma migrate deploy`, not `prisma db push`.
4. If a duplicate prefix exists, it must be listed in this file so it is an explicit migration-history exception rather than accidental sloppiness.

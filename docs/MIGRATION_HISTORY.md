# Migration History Policy — Build 6.5.0

Migration folder names are immutable after release. Three timestamp prefixes were historically reused. Those original folder names are preserved alongside the later renumbered aliases so databases that recorded either naming convention can migrate without editing `_prisma_migrations`.

## Preserved duplicate-prefix groups

### `20260712000400`
- `20260712000400_build_480_security_hardening`
- `20260712000400_build_530_pos_integration`
- compatibility alias: `20260712000450_build_530_pos_integration`

### `20260712000500`
- `20260712000500_build_520_commercial_saas`
- `20260712000500_build_550_smoker_catalog`
- compatibility alias: `20260712000550_build_550_smoker_catalog`

### `20260712000600`
- `20260712000600_build_570_official_smoker_catalog`
- `20260712000600_build_580_smoker_catalog_units`
- compatibility alias: `20260712000650_build_580_smoker_catalog_units`

The paired original/alias SQL is byte-identical and idempotent. Fresh databases replay both safely. Existing databases apply only the name they have not recorded. No deploy script rewrites Prisma's private migration table.

Policy:

1. Never rename or delete a released migration folder.
2. Never update `_prisma_migrations` from the normal deploy path.
3. Every new migration uses a unique timestamp prefix.
4. CI replays the complete chain on a fresh PostgreSQL database.
5. CI performs a dump-and-restore drill and a post-migration smoke check.
6. Any future compatibility alias must be documented here and use idempotent SQL.

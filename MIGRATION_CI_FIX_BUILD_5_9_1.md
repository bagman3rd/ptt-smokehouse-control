# Build 5.9.1 — CI Migration Fix

Build 5.9.0 deployed on existing production because the production database already had historical migrations recorded, but GitHub Actions rebuilt from a fresh PostgreSQL database and exposed a new issue: the repaired full baseline creates the current POS tables and constraints, then the older POS migration also tried to add the same foreign-key constraints without a duplicate-object guard.

Build 5.9.1 fixes that by making the POS integration migration idempotent:

- `MenuItemMapping_restaurantId_fkey`
- `MenuItemMapping_proteinId_fkey`
- `PosImportBatch_restaurantId_fkey`
- `PosImportRow_restaurantId_fkey`
- `PosImportRow_batchId_fkey`
- `PosImportRow_mappedProteinId_fkey`

The constraints are now wrapped in `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` blocks, matching the safer pattern already used by the commercial SaaS and smoker catalog migrations.

No feature work was added. This build exists to make fresh-database CI green and stop the failure emails.

# Multi-Location Migration Runbook — Build 12.1.0

## Preflight

1. Back up isolated staging.
2. Record the current schema, row counts, and release revision.
3. Select the default Pigeon Forge location ID.
4. Inventory every operational table requiring tenantId/locationId.
5. Add required foreign keys, uniqueness rules, and indexes in the real repository migration.
6. Map every legacy row to the default location.
7. Confirm unscoped record count is zero.
8. Run authorization, tenant-isolation, performance, and two-location UAT.

## Rollback

Restore the pre-migration schema/data snapshot or execute the approved reverse migration. Reconcile row counts, identifiers, audit history, and critical workflows.

This overlay does not execute the migration.

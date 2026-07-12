# Build 6.3.2 — Tenant Audit Compile Fix

Build 6.3.2 fixes a TypeScript/Prisma compile failure introduced when `AuditLog.restaurantId` became non-null in Build 6.3.0.

## Correction

- Tenant-scoped audit records now write only when a valid restaurant ID is available.
- The audit helper no longer passes `null` to the required `AuditLog.restaurantId` field.
- Authentication events that cannot be associated with a tenant are skipped rather than inserted into a tenant-owned table with invalid ownership.
- Existing tenant-scoped audit behavior is unchanged.
- No database migration or production-data modification is included.

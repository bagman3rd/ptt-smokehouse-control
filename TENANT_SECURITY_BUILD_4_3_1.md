# Tenant & Security Notes — Build 4.3.1

Build 4.3.1 is a compile-fix patch for Build 4.3.0.

## Fix

Build 4.3.0 introduced a Prisma tenant-guard extension. The exported `prisma` client is therefore an extended client, not the raw `PrismaClient` type. A few shared helper functions still required raw `PrismaClient`, which caused Render TypeScript compilation to fail when those helpers were called from server actions/routes.

Build 4.3.1 updates helper signatures to accept the extended Prisma client shape.

## Preserved from Build 4.3.0

- Prisma tenant guard for tenant-scoped models in non-production environments.
- Cross-tenant regression test script.
- Postgres-backed rate limiting.
- Account lockout fields and audit events.
- Session revocation via `sessionVersion`.
- CI test coverage for tenant, account-security, permissions, and schema drift.

## Deployment

This build keeps `prisma migrate deploy` as the active Render build path and does not use `--accept-data-loss`.

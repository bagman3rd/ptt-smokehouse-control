# Production Launch Checklist — Build 12.0.0

## Technical

- Exact Git commit and Render revision recorded
- Build identity is 12.0.0
- One web, zero cron, one database
- Health, HTTPS, domain, database, and migrations pass
- Required configuration is present
- Debug, fixture, and sandbox modes are disabled
- Validation routes are disabled or ADMIN-only
- Security and performance acceptance passes
- Current backup, restore drill, and rollback rehearsal pass

## Application

- Setup and master data persist
- Forecast and approvals persist
- Production plans and smoker bookings persist
- Today events persist and are idempotent
- Quick EOD, corrections, close, and rollover persist
- Inventory ledger, holds, exceptions, counts, and close persist
- Reports reconcile to durable source transactions
- Administration changes are audited
- Normal navigation has no dead link
- Tenant isolation and role authorization pass everywhere

## Operations

- Opening data is signed
- Staff training is complete
- Release, operations, support, and incident owners are named
- Support and rollback runbooks are available
- First-day monitoring schedule is assigned
- Required technical sign-offs are complete
- Open P0/P1 counts are zero
- RELEASE_OWNER authorization is signed

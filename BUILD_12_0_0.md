# PTT Smokehouse Control — Build 12.0.0

## PTT Production Release

Build 12.0.0 packages the production-release certification, cutover, operational handoff, and explicit authorization controls for Pigeon Toed Tavern.

## Package status

`COMPLETE`

## Production authorization

`PENDING_DEPLOYED_SIGN_OFF`

A deterministic or synthetic GO does not authorize production. Production requires real staging evidence and an explicit RELEASE_OWNER authorization record.

## Release gate

Production authorization requires deployed staging evidence showing every core workflow is durable, authorized, tenant-isolated, navigable, observable, recoverable, and accepted with no open P0/P1 defect.

## Core workflow coverage

1. Setup and master data
2. Forecast and demand
3. Production and smoker scheduling
4. Today Operations
5. Quick EOD
6. Inventory, waste, holds, and exceptions
7. Reporting and forecast learning
8. Notifications and administration

## Required evidence

- Build 11.1.0 through 11.9.0 artifacts
- Exact Git commit and Render revision
- One web service, zero cron services, one PostgreSQL database
- Current database migration status
- Normal navigation with no dead links
- Validation routes disabled or ADMIN-only
- Durable database persistence for all core workflows
- Server-side role authorization
- Tenant isolation
- Mutation idempotency
- Append-only audit evidence
- Deployed UAT
- Security and performance acceptance
- Current verified backup
- Successful restore drill
- Successful rollback rehearsal
- Opening-day checklist and first-day monitoring plan
- Required operational and technical sign-offs
- Zero open P0/P1 defects

## Generated route

`/release-lab-1200`

This route is a certification lab. It must be disabled or ADMIN-only in production.

## Render topology

- Web services: 1
- Cron services: 0
- PostgreSQL databases: 1

## Scope boundary

This cumulative overlay does not fabricate missing durable integrations in an unavailable full repository. It does not deploy Render, run migrations, perform a backup or restore, execute production load, or authorize production automatically.

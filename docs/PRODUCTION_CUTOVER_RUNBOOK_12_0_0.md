# Production Cutover Runbook — Build 12.0.0

## Preflight

- Freeze the approved release commit.
- Record the current and prior verified-good Render revisions.
- Confirm one web service, zero cron services, and one PostgreSQL database.
- Confirm current backup, restore evidence, rollback evidence, and migration status.
- Confirm required environment-key presence without exposing values.
- Confirm all required sign-offs and zero open P0/P1 defects.
- Confirm production authorization remains pending until final review.

## Deploy

1. Deploy the exact approved commit.
2. Wait for the web service to become healthy.
3. Verify Build 12.0.0 identity, HTTPS, custom domain, database connectivity, and migration status.
4. Verify no cron service was created.
5. Execute authentication, authorization, tenant-isolation, and health smoke tests.
6. Execute one controlled mutation in each core workflow and verify persistence/idempotency.
7. Verify validation routes are disabled or ADMIN-only.
8. Complete PD-001 through PD-048.
9. Generate the deployed release assessment and pending manifest.
10. Review every evidence item and defect.
11. Obtain RELEASE_OWNER authorization.
12. Generate the AUTHORIZED manifest.
13. Announce cutover and begin first-day monitoring.

## Abort

Abort when any release control fails, any P0/P1 defect exists, or the authorization record is incomplete.

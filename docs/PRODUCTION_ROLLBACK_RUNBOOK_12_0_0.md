# Production Rollback Runbook — Build 12.0.0

## Trigger

Rollback for a P0/P1 security, tenant-isolation, authorization, data-integrity, persistent-write, outage, or performance failure that cannot be safely mitigated immediately.

## Procedure

1. Set the release decision to HOLD.
2. Stop new deploy activity.
3. Record the current Build 12.0.0 revision and incident evidence.
4. Select the prior verified-good Render web-service revision.
5. Roll back the web service only.
6. Do not create cron services.
7. Verify health and prior build identity.
8. Verify authentication, authorization, tenant isolation, Today, EOD, inventory, and reports.
9. Verify database and migration compatibility.
10. Reconcile writes occurring during the incident window.
11. Record rollback start, finish, actor, revision, and test results.
12. Keep Build 12.0.0 blocked until correction and regression evidence pass.

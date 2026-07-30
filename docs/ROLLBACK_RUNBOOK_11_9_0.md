# Rollback Runbook — Build 11.9.0

## Trigger

Rollback when the release produces a P0/P1 security, authorization, tenant-isolation, data-integrity, persistent error, or performance failure that cannot be safely corrected in place.

## Preconditions

- Record current release commit and Render revision.
- Record previous verified-good commit and revision.
- Confirm database compatibility.
- Capture current logs and sanitized support bundle.
- Identify the incident owner and decision authority.

## Procedure

1. Place the release decision on HOLD.
2. Stop new deployment actions.
3. Select the recorded prior verified-good Render revision.
4. Roll back the web service only.
5. Do not create cron services.
6. Confirm the web service reaches healthy status.
7. Verify build identity reports the prior release.
8. Verify login, session, authorization, tenant isolation, Today, Quick EOD, inventory, and reports.
9. Verify database connectivity and migration compatibility.
10. Confirm no duplicate or out-of-order writes occurred.
11. Record rollback start, completion, actor, revision, and results.
12. Keep the failed release blocked until root cause and regression evidence exist.

## Success

- Health endpoint passes.
- Authentication passes.
- Authorization and tenant isolation pass.
- Critical workflows pass.
- Error rate returns below the controlled threshold.
- No data reconciliation discrepancy exists.

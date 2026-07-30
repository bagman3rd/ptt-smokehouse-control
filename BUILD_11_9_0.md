# PTT Smokehouse Control — Build 11.9.0

## Security, Performance, and Recovery

Build 11.9.0 implements the final hardening stage before Build 12.0.0 production release.

## Exit gate

The release is GO only when security controls pass, performance budgets pass, database health is within limits, recovery evidence is current, rollback is executable, and no open P0/P1 defect remains.

## Implemented

1. Controlled session-policy assessment.
2. Absolute and idle session timeouts.
3. Privileged reauthentication window.
4. Privileged-role 2FA release requirement.
5. Authentication lockout controls.
6. Secure, HttpOnly, SameSite cookie controls.
7. Session rotation and revocation controls.
8. Deny-by-default role authorization.
9. Mandatory tenant context.
10. Cross-tenant denial.
11. Browser-mutation CSRF validation.
12. Webhook signature validation.
13. JSON content-type validation.
14. One-megabyte request-body limit.
15. Controlled security-header validation.
16. AUTH, API read, API mutation, and webhook rate limits.
17. Tamper-evident append-only audit hash chain.
18. API read p95 performance budget.
19. Critical mutation p95 budget.
20. Dashboard p95 budget.
21. Database query p95 budget.
22. Error-rate and throughput budgets.
23. Memory and event-loop-lag budgets.
24. Database connection-pool headroom controls.
25. Long-transaction, replication-lag, and migration-status controls.
26. Verified-backup freshness control.
27. RPO and RTO controls.
28. Restore-drill recency and reconciliation controls.
29. Rollback artifact and runbook controls.
30. GO/HOLD production-release gate.
31. Sanitized hardening support bundle.
32. Twenty deterministic scenarios.
33. Thirty-four deployed UAT scenarios.
34. Interactive hardening validation lab.
35. Security, authorization, rate-limit, audit, performance, database, recovery, release-gate, readiness, and hash evidence.
36. Dedicated GitHub Actions workflow.
37. Cumulative retention of Builds 11.1.0 through 11.8.0.
38. Render build identity updated to 11.9.0.
39. Corrected Render topology preserved: one web service, zero cron services, one PostgreSQL database.

## Generated route

`/hardening-lab-1190`

The route is isolated and does not replace an existing production administration page.

## Scope boundary

This overlay does not enable destructive security settings, perform a production load test, perform a backup or restore, or claim that production endpoints and persistence have passed. Those claims require deployed staging evidence and release sign-off.

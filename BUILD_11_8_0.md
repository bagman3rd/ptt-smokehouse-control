# PTT Smokehouse Control — Build 11.8.0

## Notifications, Administration, and Support Diagnostics

Build 11.8.0 implements deterministic notification routing, provider diagnostics, administration auditing, incident escalation, and sanitized support evidence.

## Exit gate

Critical operational events route exactly once to authorized recipients, respect quiet-hour and escalation controls, expose provider health without secrets, and generate a sanitized support bundle.

## Implemented

1. In-app, email, and SMS notification channels.
2. P0–P3 severity routing.
3. Event-specific rules for operations, inventory, reports, backups, cron jobs, and provider health.
4. Active-recipient and tenant filtering.
5. Per-recipient channel preferences.
6. Recipient quiet hours.
7. P0 quiet-hour bypass.
8. Rule-controlled P1 quiet-hour bypass.
9. Deferred-delivery timestamps.
10. Event-recipient-channel idempotency keys.
11. Explicit duplicate suppression.
12. Four-attempt retry policy.
13. Controlled 1, 5, 15, and 60 minute backoff schedule.
14. Terminal failures and dead-letter records.
15. P0 escalation at 0, 5, and 15 minutes.
16. P1 escalation at 0, 15, and 45 minutes.
17. P2 escalation at 0 and 60 minutes.
18. Incident acknowledgement that cancels future escalation.
19. Manager incident resolution.
20. Provider states: Healthy, Degraded, Unavailable, and Not Configured.
21. Provider success/failure timestamps and consecutive-failure counts.
22. Audited administration settings.
23. Before/after administration snapshots.
24. Actor, role, reason, and timestamp on changes.
25. Viewer mutation denial contract.
26. Cross-tenant action rejection.
27. Sanitized support bundle.
28. Secret-key and secret-value redaction.
29. Build, service, cron, database, provider, delivery, dead-letter, and audit diagnostics.
30. Deterministic support-bundle checksum.
31. Sixteen deterministic scenarios.
32. Thirty deployed UAT scenarios.
33. Interactive Notification and Administration Validation Lab.
34. Delivery, incident, provider, dead-letter, audit, support, readiness, and hash evidence.
35. Dedicated GitHub Actions workflow.
36. Cumulative retention of Builds 11.1.0 through 11.7.0.
37. Render build identity updated to 11.8.0.

## Generated route

`/admin-lab-1180`

The route is isolated and does not replace an existing production administration page.

## Scope boundary

No Prisma migration, dependency change, live email/SMS provider call, durable delivery persistence, or secret-value access is included. Production release hardening remains Build 11.9.0.

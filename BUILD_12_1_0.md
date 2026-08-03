# PTT Smokehouse Control — Build 12.1.0

## Multi-Location Foundation

Build 12.1.0 adds the controlled domain foundation required to operate more than one restaurant location under the same tenant.

## Exit gate

Every operational read and write resolves an explicit tenant and location, location switching is authorized, active locations have complete operating configuration, inter-location transfers reconcile exactly once, and consolidated reporting never crosses tenant boundaries.

## Implemented

1. Explicit tenant and location context.
2. No implicit first-location selection.
3. Active membership validation.
4. All-location and assigned-location membership scopes.
5. Role-based location authorization.
6. Audited location-switch records.
7. Location-specific service hours.
8. Location-specific product yields, unit weights, and forecast baselines.
9. Location-specific smokers and capacity profiles.
10. Location-specific forecast and inventory policies.
11. Active-location readiness checks.
12. Cross-location master-data fallback prohibition.
13. Deterministic location-scoped record identities.
14. Location-context record validation.
15. Inter-location transfer creation.
16. Source-location transfer approval.
17. Source inventory decrement at dispatch.
18. Destination inventory increment at receipt.
19. Command-ID idempotency for dispatch and receipt.
20. Over-receipt prevention.
21. Receipt-variance retention.
22. Consolidated owner reporting with location breakdown.
23. Internal transfer double-counting exclusion.
24. Same-tenant reporting enforcement.
25. Ten-control location onboarding.
26. Owner/Admin activation records.
27. Controlled deactivation review.
28. Historical-data retention after deactivation.
29. Single-location migration-readiness assessment.
30. Zero-unscoped-record migration requirement.
31. Thirty-two deterministic scenarios.
32. Forty-two deployed UAT scenarios.
33. Multi-Location Validation Lab.
34. Dedicated CI evidence workflow.
35. Corrected Render topology preserved: one web, zero cron, one database.

## Generated route

`/multi-location-lab-1210`

This route must be disabled or ADMIN-only in production.

## Scope boundary

No Prisma migration or durable multi-location persistence claim is included because the complete deployed repository schema is not available in this environment. Build 12.1.0 supplies deterministic domain logic, migration-readiness controls, deployment evidence requirements, and staging UAT.

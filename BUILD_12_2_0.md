# PTT Smokehouse Control — Build 12.2.0

## POS and Data Integrations

Build 12.2.0 adds the controlled integration foundation for importing actual restaurant sales, mapping provider items to PTT operating categories, reconciling source totals, supplying forecast-learning evidence, recovering failed imports, supporting manual outage entry, and ingesting supplier-cost snapshots.

## Exit gate

Every imported record must be tenant- and location-scoped, mapped or explicitly quarantined, idempotent, reconciled to its source, recoverable after failure, auditable, and safe to use for reporting or forecast learning only after the applicable gates pass.

## Implemented

1. Provider connection-health model.
2. Production-versus-sandbox environment gate.
3. Tenant, location, and provider-location validation.
4. Deterministic sales-payload normalization.
5. Source-payload SHA-256 hashes.
6. Provider-event idempotency keys.
7. Duplicate order-line prevention.
8. Refund and negative-sales validation.
9. Location-scoped item mapping.
10. Mapping versions and effective dates.
11. Food, bar, merchandise, and ignored classifications.
12. Unmapped-line quarantine.
13. Source-total reconciliation.
14. Classification-conservation reconciliation.
15. Reporting eligibility gates.
16. Forecast-learning eligibility gates.
17. Daily location sales summaries.
18. Actual-versus-forecast comparisons.
19. Product quantity-to-cooked-pound conversion.
20. Controlled forecast-learning inputs.
21. No automatic forecast-factor changes.
22. Failed and partial-batch retry model.
23. Successful-line protection during retries.
24. Maximum-attempt escalation.
25. Audited manual outage fallback.
26. Large-manual-entry approval threshold.
27. Manual/provider collision protection.
28. Supplier-cost snapshot identities.
29. Supplier duplicate suppression.
30. Supplier cost-change alerts.
31. No automatic menu-price changes.
32. Two-location sales consolidation.
33. Thirty-six deterministic scenarios.
34. Forty-four deployed UAT scenarios.
35. Integration Validation Lab.
36. Dedicated CI evidence workflow.
37. Corrected Render topology preserved: one web, zero cron, one database.

## Generated route

`/integration-lab-1220`

This route must be disabled or ADMIN-only in production.

## Scope boundary

No live provider credential, provider API call, webhook registration, supplier download, Prisma migration, or durable integration claim is included. The complete deployed repository and provider accounts are required for production adapters and persistence.

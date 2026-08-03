# POS Adapter Contract — Build 12.2.0

A production adapter must:

1. Keep credentials and signatures server-side.
2. Use the production provider environment.
3. Verify webhook signatures where webhooks are used.
4. Normalize provider payloads into the Build 12.2.0 sales contract.
5. Persist raw-source hashes without persisting secret values.
6. Enforce provider-event and line identities with database uniqueness.
7. Handle provider pagination and rate limits.
8. Resume partial batches without duplicating successful lines.
9. Expose connection health and operator guidance.
10. Produce official reconciliation evidence.

This overlay does not implement or call a live adapter.

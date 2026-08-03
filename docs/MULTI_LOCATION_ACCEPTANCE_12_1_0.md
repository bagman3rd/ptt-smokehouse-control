# Build 12.1.0 Acceptance

## Deterministic acceptance

- ML-001 through ML-032 pass.
- Two active locations pass readiness.
- Location selection is explicit.
- Transfer lifecycle reaches RECEIVED.
- Source effect equals -20 cooked lb.
- Destination effect equals +20 cooked lb.
- Consolidated transfer net equals zero.
- Onboarding is ready for activation.
- Clean deactivation is ready.
- Migration unscoped count equals zero.
- Render topology is one web, zero cron, one database.

## Deployed acceptance

- MX-001 through MX-042 pass.
- Real schema and indexes support tenant/location predicates.
- Durable transfer and switch records pass idempotency.
- Two-location concurrency passes.
- Migration and rollback reconcile.
- No P0/P1 defect remains.

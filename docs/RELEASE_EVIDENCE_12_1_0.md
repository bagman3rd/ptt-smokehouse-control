# Build 12.1.0 Release Evidence

## Identity

- Git commit:
- Render revision:
- Staging environment:
- Migration revision:
- Release owner:
- QA owner:

## Deterministic evidence

- [ ] ML-001 through ML-032 pass.
- [ ] Both active locations are READY.
- [ ] Transfer source/destination effects reconcile.
- [ ] Consolidated transfer net is zero.
- [ ] Onboarding, deactivation, and migration controls pass.
- [ ] Forty-two UAT rows are generated.
- [ ] Render topology is one web, zero cron, one database.
- [ ] Durable persistence remains marked pending.

## Deployed evidence

- [ ] MX-001 through MX-042 pass.
- [ ] Schema, foreign keys, uniqueness rules, and indexes reviewed.
- [ ] Zero unscoped legacy records.
- [ ] Migration rehearsal passes.
- [ ] Migration rollback passes.
- [ ] Two-location concurrency passes.
- [ ] Authorization and tenant/location isolation pass.
- [ ] Transfer idempotency and reconciliation pass.
- [ ] Consolidated reporting passes.
- [ ] No open P0/P1 defect.

## Decision

- [ ] GO
- [ ] HOLD
- [ ] RETEST REQUIRED

# Build 12.2.0 Release Evidence

## Identity

- Git commit:
- Render revision:
- Provider environment:
- Provider application/account:
- Webhook registration:
- Staging database:
- Release owner:
- Integration tester:

## Deterministic evidence

- [ ] DI-001 through DI-036 pass.
- [ ] Two controlled batches reconcile.
- [ ] Imported total is 40,000 cents.
- [ ] Source difference is zero.
- [ ] Unmapped controlled sales are zero.
- [ ] Forecast variances are +1,000 and -1,000 cents.
- [ ] Retry protection passes.
- [ ] Manual fallback remains excluded from learning.
- [ ] Supplier alert passes without automatic pricing.
- [ ] Forty-four UAT rows are generated.
- [ ] Render topology is one web, zero cron, one database.
- [ ] Live provider status remains NOT_CONNECTED_BY_OVERLAY.

## Deployed evidence

- [ ] IX-001 through IX-044 pass.
- [ ] Credentials and webhook signatures are secure.
- [ ] Durable schema and unique constraints pass.
- [ ] Two provider locations remain isolated.
- [ ] Duplicate events and lines are idempotent.
- [ ] Every production batch reconciles.
- [ ] Unmapped queue is resolved or approved.
- [ ] Retry and partial recovery pass.
- [ ] Manual collision behavior passes.
- [ ] Supplier cost import and alerts pass.
- [ ] No P0/P1 defect or unreconciled production batch remains.

## Decision

- [ ] GO
- [ ] HOLD
- [ ] RETEST REQUIRED

# Build 11.9.0 Release Evidence

## Identity

- Build: 11.9.0
- Git commit:
- GitHub Actions run:
- Hardening artifact:
- Render deploy:
- Render revision:
- Prior verified-good revision:
- Staging environment:
- Release owner:
- Security tester:
- Performance tester:
- Recovery tester:

## Deterministic evidence

- [ ] SPR-001 through SPR-020 passed.
- [ ] Session assessment passed.
- [ ] Request-security assessment passed.
- [ ] Audit chain verified.
- [ ] Audit tampering was detected.
- [ ] Performance assessment passed.
- [ ] Database assessment passed.
- [ ] Recovery assessment passed.
- [ ] Sanitized bundle leak count is zero.
- [ ] Release decision is GO.
- [ ] Render topology is one web, zero cron, one database.
- [ ] Engine version is PTT_SECURITY_PERFORMANCE_RECOVERY_11_9_0.

## Deployed security

- [ ] Session timeout controls pass.
- [ ] Privileged 2FA policy passes.
- [ ] Session rotation and revocation pass.
- [ ] Authorization matrix passes server-side.
- [ ] Tenant isolation passes.
- [ ] CSRF and webhook signature controls pass.
- [ ] Request size and content type pass.
- [ ] Required security headers are present.
- [ ] Rate limits pass.
- [ ] Audit integrity passes.

## Deployed performance

- [ ] API read p95 <= 500 ms.
- [ ] Critical mutation p95 <= 750 ms.
- [ ] Dashboard p95 <= 2,000 ms.
- [ ] Database query p95 <= 250 ms.
- [ ] Error rate <= 1%.
- [ ] Throughput >= 50 requests/second.
- [ ] Memory <= 768 MB.
- [ ] Event-loop p95 <= 100 ms.
- [ ] Database pool and transaction controls pass.

## Recovery and rollback

- [ ] Verified backup age <= 26 hours.
- [ ] Recovery point age <= 24 hours.
- [ ] Restore drill age <= 90 days.
- [ ] Restore duration <= four hours.
- [ ] Restore data reconciles.
- [ ] Rollback artifact and runbook are recorded.
- [ ] Staging rollback executed successfully.
- [ ] Post-rollback health, authorization, and tenant isolation pass.

## Decision

- [ ] GO — authorize Build 12.0.0
- [ ] HOLD
- [ ] RETEST REQUIRED

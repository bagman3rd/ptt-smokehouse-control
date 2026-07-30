# Build 11.8.0 Release Evidence

## Identity

- Build: 11.8.0
- Git commit:
- GitHub Actions run:
- Notification/admin artifact:
- Render deploy:
- Blueprint sync:
- Staging environment:
- Email sandbox:
- SMS sandbox:
- Release owner:
- Test lead:

## Deterministic evidence

- [ ] Notification/admin fixture test passed.
- [ ] NA-001 P0 bypass passed.
- [ ] NA-002 quiet-hour deferral passed.
- [ ] NA-003 channel preference passed.
- [ ] NA-004 inactive-recipient exclusion passed.
- [ ] NA-005 duplicate suppression passed.
- [ ] NA-006 retry/dead-letter passed.
- [ ] NA-007 acknowledgement cancellation passed.
- [ ] NA-008 degraded provider passed.
- [ ] NA-009 not-configured provider passed.
- [ ] NA-010 admin audit passed.
- [ ] NA-011 Viewer denial passed.
- [ ] NA-012 tenant isolation passed.
- [ ] NA-013 secret sanitization passed.
- [ ] NA-014 deterministic checksum passed.
- [ ] NA-015 provider-outage in-app path passed.
- [ ] NA-016 P1 escalation passed.
- [ ] Thirty deployed UAT rows generated.
- [ ] Engine version is PTT_NOTIFICATION_ADMIN_11_8_0.

## Deployed workflow

- [ ] Email sandbox delivery reconciles.
- [ ] SMS sandbox delivery reconciles.
- [ ] In-app delivery reconciles.
- [ ] Quiet hours use restaurant timezone.
- [ ] Duplicate routing is idempotent.
- [ ] Retry and dead letter persist.
- [ ] Escalation and acknowledgement persist.
- [ ] Admin audit is immutable.
- [ ] Viewer denial passes server-side.
- [ ] Tenant isolation passes server-side.
- [ ] Support bundle contains no secret or personal data.
- [ ] Support bundle is sufficient for support diagnosis.

## Decision

- [ ] APPROVE
- [ ] REJECT
- [ ] RETEST REQUIRED

# Build 11.7.0 Release Evidence

## Identity

- Build: 11.7.0
- Git commit:
- GitHub Actions run:
- Reporting artifact:
- Render deploy:
- Blueprint sync:
- Staging environment:
- Release owner:
- Test lead:

## Deterministic evidence

- [ ] Reporting fixture test passed.
- [ ] RL-001 daily reconciliation passed.
- [ ] RL-002 forecast variance passed.
- [ ] RL-003 zero denominator passed.
- [ ] RL-004 actual yield passed.
- [ ] RL-005 waste rate passed.
- [ ] RL-006 plan adherence passed.
- [ ] RL-007 smoker utilization passed.
- [ ] RL-008 missing-source blocker passed.
- [ ] RL-009 weekly aggregation passed.
- [ ] RL-010 recommendation bounds passed.
- [ ] RL-011 insufficient data passed.
- [ ] RL-012 approval evidence passed.
- [ ] RL-013 exports passed.
- [ ] RL-014 tenant isolation passed.
- [ ] Daily and weekly unexplained difference equals zero.
- [ ] Four recommendations generated.
- [ ] No recommendation auto-applies.
- [ ] Thirty deployed UAT rows generated.
- [ ] Engine version is PTT_REPORTING_LEARNING_11_7_0.

## Deployed workflow

- [ ] Daily report matches source transactions.
- [ ] Weekly report matches daily reports.
- [ ] Formula explanations are available.
- [ ] Zero denominators display N/A.
- [ ] Missing sources block completion.
- [ ] Unexplained differences block completion.
- [ ] CSV and JSON exports reconcile.
- [ ] Incomplete observations are excluded from learning.
- [ ] Bounds are enforced.
- [ ] Approval is server-authorized and durable.
- [ ] Recommendation evidence remains immutable.
- [ ] Viewer approval is denied.
- [ ] Tenant and location isolation pass.
- [ ] Daily/weekly report performance targets pass.

## Decision

- [ ] APPROVE
- [ ] REJECT
- [ ] RETEST REQUIRED

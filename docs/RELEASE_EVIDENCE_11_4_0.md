# Build 11.4.0 Release Evidence

## Identity

- Build: 11.4.0
- Git commit:
- GitHub Actions run:
- Production artifact:
- Render deploy:
- Blueprint sync:
- Staging environment:
- Release owner:
- Test lead:

## Deterministic requirements

- [ ] Production fixture test passed.
- [ ] PP-001 carryover-adjusted requirements passed.
- [ ] PP-002 stale carryover exclusion passed.
- [ ] PP-003 sealed brisket exclusion passed.
- [ ] PP-004 missing unit-weight blocker passed.
- [ ] PP-005 capacity shortfall passed.
- [ ] PP-006 multiple-cycle scheduling passed.
- [ ] PP-007 backup smoker behavior passed.
- [ ] PP-008 Sunday load for Monday demand passed.
- [ ] Seven-day evidence contains seven operating dates.
- [ ] No negative production quantity exists.
- [ ] Production calculation version is PTT_PRODUCTION_PLAN_11_4_0.

## Deployed workflow

- [ ] Approved forecast ID is preserved.
- [ ] Prior-day EOD carryover is visible and applied once.
- [ ] Raw conversion and whole-unit rounding are explainable.
- [ ] Overage is visible.
- [ ] Every scheduled batch has smoker, quantity, capacity, start and end.
- [ ] No exclusive smoker bookings overlap.
- [ ] Capacity shortfall blocks approval.
- [ ] Validation-only capacity cannot be released as production truth.
- [ ] KM/OWNER approval succeeds.
- [ ] KC/VIEWER mutation is denied server-side.
- [ ] Duplicate approval is idempotent.
- [ ] Tenant isolation passes.
- [ ] Historical approved plans retain original inputs and versions.

## Decision

- [ ] APPROVE
- [ ] REJECT
- [ ] RETEST REQUIRED

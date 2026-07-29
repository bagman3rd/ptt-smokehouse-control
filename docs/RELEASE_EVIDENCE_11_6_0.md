# Build 11.6.0 Release Evidence

## Identity

- Build: 11.6.0
- Git commit:
- GitHub Actions run:
- Inventory artifact:
- Render deploy:
- Blueprint sync:
- Staging environment:
- Release owner:
- Test lead:
- Inexperienced UAT operator:

## Deterministic evidence

- [ ] Inventory fixture test passed.
- [ ] IC-001 balanced close passed.
- [ ] IC-002 negative guard passed.
- [ ] IC-003 waste reason passed.
- [ ] IC-004 hold release passed.
- [ ] IC-005 hold discard passed.
- [ ] IC-006 exception ownership passed.
- [ ] IC-007 idempotency passed.
- [ ] IC-008 variance classification passed.
- [ ] IC-009 manager adjustment passed.
- [ ] IC-010 transfer pairing passed.
- [ ] IC-011 Viewer denial passed.
- [ ] IC-012 tenant isolation passed.
- [ ] Four products reconciled.
- [ ] No negative balance exists.
- [ ] No open blocking hold exists.
- [ ] No open P0/P1 exception exists.
- [ ] Engine version is PTT_INVENTORY_CONTROL_11_6_0.

## Deployed workflow

- [ ] Production receipt persists once.
- [ ] Service usage cannot exceed available.
- [ ] Waste reason and quantity persist.
- [ ] Hold open/release/discard persists.
- [ ] Exception owner and lifecycle persist.
- [ ] Count thresholds are correct.
- [ ] Corrections preserve originals.
- [ ] Adjustments retain reason and actor.
- [ ] Transfer pairing retains transfer ID.
- [ ] Duplicate commands are idempotent.
- [ ] Viewer mutations fail server-side.
- [ ] Tenant isolation passes.
- [ ] Close blockers work.
- [ ] Tablet controls remain visible and labeled.
- [ ] Provider outage does not block core inventory workflow.
- [ ] Inexperienced operator completes IN-028 without coaching.

## Decision

- [ ] APPROVE
- [ ] REJECT
- [ ] RETEST REQUIRED

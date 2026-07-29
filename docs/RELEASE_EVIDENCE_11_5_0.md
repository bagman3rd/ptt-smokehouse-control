# Build 11.5.0 Release Evidence

## Identity

- Build: 11.5.0
- Git commit:
- GitHub Actions run:
- Today Operations artifact:
- Render deploy:
- Blueprint sync:
- Staging environment:
- Release owner:
- Test lead:
- Inexperienced UAT operator:

## Deterministic evidence

- [ ] Today Operations fixture test passed.
- [ ] TO-001 full day passed.
- [ ] TO-002 invalid transition passed.
- [ ] TO-003 duplicate command passed.
- [ ] TO-004 Viewer restriction passed.
- [ ] TO-005 urgent actions passed.
- [ ] TO-006 EOD validation passed.
- [ ] TO-007 EOD correction passed.
- [ ] TO-008 exception close gate passed.
- [ ] TO-009 rollover passed.
- [ ] TO-010 load correction passed.
- [ ] Closed day has four completed loads.
- [ ] Closed day has four complete EOD submissions.
- [ ] Event command IDs are unique.
- [ ] Sealed brisket eligible rollover equals zero.
- [ ] Engine version is PTT_TODAY_OPERATIONS_11_5_0.

## Deployed workflow

- [ ] Today is the obvious default operations workflow.
- [ ] Operating date and day of week are correct.
- [ ] Weather/event notes and forecast summary display correctly.
- [ ] Load cards contain all required fields.
- [ ] Named ownership persists.
- [ ] Actual load quantity and timestamps persist.
- [ ] Invalid transitions fail safely.
- [ ] Exception and resolution history persists.
- [ ] Quick EOD validates units and plausibility.
- [ ] EOD correction preserves original submission.
- [ ] Incomplete day cannot close.
- [ ] Duplicate action does not duplicate durable write.
- [ ] Rollover creates the next consecutive operating date.
- [ ] Viewer mutation is denied server-side.
- [ ] Tenant isolation passes.
- [ ] Tablet workflow has no hidden critical control.
- [ ] Provider outage does not block Today or Quick EOD.
- [ ] Inexperienced operator completes TD-026 without coaching.

## Operations

- [ ] Web service, cron jobs and PostgreSQL are healthy.
- [ ] Current backup is verified.
- [ ] Rollback revision and steps are recorded.
- [ ] No repeated Today, EOD, authorization or database error appears in logs.

## Defects

- Open P0:
- Open P1:
- Accepted P2:
- Accepted P3:
- Deferred item and target build:

## Decision

- [ ] APPROVE
- [ ] REJECT
- [ ] RETEST REQUIRED

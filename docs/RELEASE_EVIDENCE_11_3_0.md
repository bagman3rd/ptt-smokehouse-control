# Build 11.3.0 Release Evidence

## Identity

- Build: 11.3.0
- Git commit:
- GitHub Actions run:
- Forecast artifact:
- Render deploy:
- Blueprint sync:
- Staging environment:
- Release owner:
- Test lead:

## Deterministic calculation

- [ ] Forecast fixture test passed.
- [ ] F-001 Monday baseline passed.
- [ ] F-002 Saturday baseline passed.
- [ ] F-003 monthly/event uplift passed.
- [ ] F-004 manual reduction passed.
- [ ] F-005 Sunday demand passed.
- [ ] F-006 Monday service-date rule passed.
- [ ] F-007 low-confidence result passed.
- [ ] F-008 high-confidence result passed.
- [ ] 20% bar / 80% food display passed.
- [ ] Calculation version is PTT_FORECAST_11_3_0.

## Deployed workflow

- [ ] Forecast input fields load and validate.
- [ ] DOW, monthly, event and manual factors are visible.
- [ ] Original automatic and final adjusted values are retained.
- [ ] Confidence explanation is visible.
- [ ] Non-zero manual adjustment requires reason.
- [ ] Extreme automatic factor requires review.
- [ ] KM/OWNER approval succeeds.
- [ ] KC/VIEWER approval is denied server-side.
- [ ] Duplicate approval does not create duplicate history.
- [ ] Tenant isolation passes.
- [ ] Approved historical record preserves inputs and calculation version.
- [ ] External provider disablement does not block core forecast calculation.

## Operations

- [ ] Web service, cron jobs and PostgreSQL are healthy.
- [ ] Current backup is verified.
- [ ] Rollback revision and steps are recorded.
- [ ] No new repeated forecast or authorization error appears in logs.

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

Approval requires no open P0/P1 defect and objective evidence tied to the exact deployed revision.

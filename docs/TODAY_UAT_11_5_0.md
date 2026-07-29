# Today Operations UAT — Build 11.5.0

Use `artifacts/build-11.5.0/today-uat-workbook.csv`.

## Environment

- Isolated persistent staging database
- Exact release commit
- Separate synthetic tenants
- Accounts for ADMIN, OWNER, KM, PITMASTER, KC and VIEWER
- Target kitchen tablet and desktop
- Approved forecast and production plan for one service date
- External providers disabled for the outage scenario

## Inexperienced-user test

The tester must not be coached through the interface. Provide only the operating objective:

1. Open today's work.
2. Assign or confirm responsibility.
3. Execute every load.
4. Record any exception and resolve it.
5. Complete Quick EOD.
6. Close the operating date.
7. Roll to the next date.

Record hesitation, wrong turns, hidden controls, unclear labels, backtracking and any need for developer assistance.

## Evidence

- Screen recording or timestamped screenshots
- Network requests for every mutation
- Database/audit records
- Duplicate-request evidence
- Server authorization failures
- Tenant-isolation results
- Tablet screenshots
- Provider-outage results
- Final closed-day and rollover records

P0/P1 defects block release.

# Production Planning UAT — Build 11.4.0

Use `artifacts/build-11.4.0/production-uat-workbook.csv`.

## Environment

- Isolated persistent staging database.
- Exact release commit.
- Separate synthetic tenants.
- Accounts for ADMIN, OWNER, KM, KC, PITMASTER and VIEWER.
- Approved measured weights, durations and capacities clearly separated from validation-only examples.
- No production provider credentials.

## Method

1. Start from an approved forecast.
2. Enter prior-day EOD sealed/open carryover.
3. Generate product requirements and compare exact formulas.
4. Verify whole-unit rounding and visible overage.
5. Generate smoker bookings and inspect every interval for overlap.
6. Exhaust capacity and confirm explicit blocked shortfall.
7. Test backup/overflow behavior.
8. Generate seven consecutive operating dates.
9. Test Monday demand with Sunday load dates.
10. Test server-side authorization, tenant isolation and idempotent approval.
11. Reopen approved records after master-data changes.
12. Record screenshots, logs and defects.

P0/P1 defects block release.

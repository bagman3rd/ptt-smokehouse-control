# Reporting and Forecast Learning UAT — Build 11.7.0

Use `artifacts/build-11.7.0/reporting-uat-workbook.csv`.

## Environment

- Isolated persistent staging database
- Exact release commit
- Separate synthetic tenants and locations
- ADMIN, OWNER, KM, PITMASTER, KC, and VIEWER accounts
- Seven complete operating dates
- At least one incomplete, mismatched, zero-denominator, late-load, and over-capacity scenario

## Method

1. Reconcile a daily report line by line to its forecast, plan, execution, ledger, waste, and count records.
2. Reconcile the weekly report to the seven daily reports.
3. Independently calculate each formula.
4. Export CSV and JSON and compare them to the screen and source data.
5. Generate insufficient, normal, upward-bounded, and downward-bounded recommendations.
6. Approve as KM and attempt approval as unauthorized roles.
7. Attempt cross-tenant and cross-location report generation.
8. Repeat unchanged report and export generation to prove determinism.
9. Record screenshots, requests, database rows, calculations, and defects.

P0/P1 defects block release.

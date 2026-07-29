# Inventory Control UAT — Build 11.6.0

Use `artifacts/build-11.6.0/inventory-uat-workbook.csv`.

## Environment

- Isolated persistent staging database
- Exact release commit
- Separate synthetic tenants and locations
- ADMIN, OWNER, KM, PITMASTER, KC, and VIEWER accounts
- Target kitchen tablet and desktop
- Approved Today/production data
- External providers disabled for outage testing

## Full-day test

The inexperienced operator receives only this objective:

1. Open the inventory workflow.
2. Receive completed production.
3. Record service usage and waste.
4. Open and resolve a quality hold.
5. Open, assign, acknowledge, and resolve an exception.
6. Count all four products.
7. Reconcile any variance.
8. Close the inventory day.

Record hesitation, hidden controls, unclear units, wrong turns, duplicate clicks, and developer assistance.

## Evidence

- Screen recording or timestamped screenshots
- Mutation requests and responses
- Database ledger and event rows
- Hold and exception history
- Count and adjustment records
- Role-denial evidence
- Tenant-isolation evidence
- Duplicate-request evidence
- Tablet screenshots
- Provider-outage results

P0/P1 defects block release.

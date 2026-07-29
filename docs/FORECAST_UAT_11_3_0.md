# Forecast UAT — Build 11.3.0

Use `artifacts/build-11.3.0/forecast-uat-workbook.csv`.

## Environment

- Isolated persistent staging database.
- Synthetic accounts for ADMIN, OWNER, KM, KC, PITMASTER and VIEWER.
- A second tenant for isolation testing.
- Exact Build 11.3.0 commit.
- No production provider credentials.

## Method

1. Reproduce all known fixtures in the validation lab and the real application workflow.
2. Compare formula factors and every product line.
3. Test normal, invalid, warning, low-confidence and override paths.
4. Test approval by authorized and unauthorized roles.
5. Repeat approval requests to prove idempotency.
6. Reopen the record to verify calculation version and audit history.
7. Attempt cross-tenant read and mutation.
8. Capture screenshots and relevant server logs.
9. Record every defect in the Build 11.3.0 defect register.

## Completion

Every FD-001 through FD-016 row must pass or be approved as not applicable with a written rationale. P0/P1 defects block release.

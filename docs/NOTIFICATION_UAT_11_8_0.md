# Notification and Administration UAT — Build 11.8.0

Use `artifacts/build-11.8.0/notification-admin-uat-workbook.csv`.

## Environment

- Isolated persistent staging database
- Exact release commit
- Separate synthetic tenants
- ADMIN, OWNER, KM, PITMASTER, KC, and VIEWER accounts
- Approved email/SMS sandbox providers
- Test recipients controlled by the project team
- Synthetic secrets and personal data for sanitization tests only

## Method

1. Route each severity during and outside quiet hours.
2. Verify every recipient, role, channel, and idempotency key.
3. Fail provider attempts through retry and dead letter.
4. Acknowledge and resolve incidents.
5. Change controlled settings and inspect audit history.
6. Attempt Viewer and cross-tenant mutations.
7. Generate a support bundle with seeded synthetic secrets.
8. Compare live provider sandbox evidence to application delivery rows.
9. Record requests, responses, provider receipts, database rows, screenshots, and defects.

P0/P1 defects block release.

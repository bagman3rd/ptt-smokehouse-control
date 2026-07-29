# Fresh Tenant UAT — Build 11.2.0

Use `artifacts/build-11.2.0/fresh-tenant-uat-workbook.csv` as the execution record.

## Environment

- Isolated persistent staging database.
- Nonproduction credentials.
- Synthetic users for all six canonical roles.
- A second tenant for isolation testing.
- No production notification, payment or backup destination.

## Method

1. Begin with no restaurant-specific configuration.
2. Complete setup only through application pages or approved application APIs.
3. Record every screen, control, validation message and resulting audit record.
4. Test direct URLs and crafted requests for restricted roles.
5. Capture screenshots for normal, denied, invalid, empty and error states.
6. Confirm all configuration belongs to the intended tenant and location.
7. Confirm effective-dated changes preserve historical approved results.
8. Complete the owner review and release evidence.

## Required result

All FT-001 through FT-018 rows pass or are explicitly marked not applicable with written approval. Any confirmed P0/P1 defect blocks Build 11.2.0.

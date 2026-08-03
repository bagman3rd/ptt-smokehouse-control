# POS and Data Integrations UAT — Build 12.2.0

Use `artifacts/build-12.2.0/pos-data-integrations-uat-workbook.csv`.

Required staging assets:

- Production-equivalent provider sandbox or controlled test account
- Two provider locations mapped to two application locations
- Signed webhook fixtures where applicable
- Complete daily order/line/refund/void payloads
- Mapped, unmapped, and ignored items
- Provider timeout and rate-limit fixtures
- Partial-success fixtures
- Official POS close reports
- Supplier cost files
- Manual outage source documents
- Durable database tables and indexes

Capture request IDs, hashes, database rows, reconciliation totals, retries, audit records, performance, redaction, and defect evidence.

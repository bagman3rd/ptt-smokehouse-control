# Security, Performance, and Recovery UAT — Build 11.9.0

Use `artifacts/build-11.9.0/hardening-uat-workbook.csv`.

## Environment

- Isolated persistent staging database
- Exact release commit
- Production-equivalent environment variables without production secrets
- ADMIN, OWNER, KM, PITMASTER, KC, and VIEWER accounts
- Two synthetic tenants
- Target desktop and kitchen tablet
- Controlled load generator
- Verified staging backup
- Restore target isolated from production
- Recorded prior verified-good Render revision

## Evidence

- Authentication/session recordings
- Authorization and tenant-isolation requests
- Security-header capture
- CSRF, webhook, content-type, request-size, and rate-limit results
- Audit-chain and tamper evidence
- Load-test raw samples and summary
- Database-pool and query evidence
- Backup metadata
- Restore-drill timestamps and reconciliation
- Rollback timestamps and post-rollback results
- Sanitized support bundle
- Release-gate JSON
- Defect register

P0/P1 defects or any HOLD decision block Build 12.0.0.

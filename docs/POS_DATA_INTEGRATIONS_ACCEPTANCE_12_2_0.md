# Build 12.2.0 Acceptance

## Deterministic acceptance

- DI-001 through DI-036 pass.
- Two batches reconcile exactly.
- Controlled imported net sales equal 40,000 cents.
- Pigeon Forge variance equals +1,000 cents.
- Knoxville variance equals -1,000 cents.
- Retry preserves one successful line.
- Manual fallback is MANUAL and excluded from learning.
- Supplier snapshot has two items and one alert.
- No menu price changes automatically.
- Render topology is one web, zero cron, one database.

## Deployed acceptance

- IX-001 through IX-044 pass.
- Live credentials remain server-side and redacted.
- Production provider environment and signatures pass.
- Durable schema and uniqueness rules pass.
- All imported days reconcile to official POS reports.
- No unreconciled production batch remains.
- No P0/P1 defect remains.

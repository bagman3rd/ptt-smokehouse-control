# Build 3.8.1 Pilot Readiness Notes

Build 3.8.1 focuses on operational reliability and commercial polish.

## Added

- Admin system test-status tracking.
- Backup restore drill tracking.
- Setup completion score.
- Setup-blocking warnings.
- POS CSV import preview and confirmation.
- Forecast-change impact preview before learning changes are applied.
- Printable daily cook-plan view.
- Expanded audit coverage for login, report export, and backup export.

## Still required before outside paying customers

1. Run tenant-isolation tests against real staging PostgreSQL.
2. Run backup export tests against real staging PostgreSQL.
3. Perform and record a restore drill.
4. Repair/baseline migrations and switch back to `prisma migrate deploy` only after staging passes.
5. Replace in-memory rate limiting before scaling beyond one server instance.

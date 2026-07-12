# Backup Restore Drill — Build 4.1.0

A backup is not proven until it has been restored and verified. Use this drill before relying on the app during the PTT pilot and before onboarding any outside customer.

## Goal

Prove that exported tenant data or a database backup can be restored into a new database and that the app can boot against that restored data.

## Drill steps

1. Trigger a tenant JSON backup through `/api/admin/backups/weekly` or `/api/admin/tenant/export`.
2. Create a fresh staging PostgreSQL database.
3. Restore a database-level backup or import the tenant JSON using the current restore procedure.
4. Point a staging app service at the restored database using its `DATABASE_URL`.
5. Run:

```bash
pnpm run test:tenant
pnpm run test:forecast
pnpm run test:backup
```

6. Open the staging app and verify:
   - Login works.
   - Restaurant list is correct.
   - Users and roles are correct.
   - Cook plans are present.
   - EOD logs are present.
   - Reports run.
   - Learning page loads.
   - System page shows the restored tenant correctly.

7. Record a `RESTORE_DRILL` SystemCheck as PASS in `/admin/system` with notes that include:
   - Source backup date/time
   - Target staging database name
   - Record counts verified
   - Person who verified

## Passing standard

The drill only passes if the restored app boots and the record counts match the backup/export counts closely enough to trust operational continuity.

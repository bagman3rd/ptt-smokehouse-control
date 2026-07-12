# TEST REPORT — Build 4.0.0

## Scope

Build 4.0.0 addresses the remaining concentrated pilot risk: migration recovery, backup discipline, and operational trust before live PTT data accumulates.

## Static checks performed

Executed:

```bash
node scripts/build-4-0-0-evaluation.mjs
```

Result:

```text
Build 4.0.0 evaluation checks completed.
```

## Verified

- package.json version is `4.0.0`.
- Nav badge displays `Build 4.0.0`.
- Render deploy remains in db-push recovery mode.
- Render deploy does not use `--accept-data-loss`.
- Manual backup export identifies Build 4.0.0.
- Migration repair runbook exists.
- Pilot readiness notes exist.
- `/admin/system` surfaces migration repair requirements.
- `/admin/system` includes scheduled-backup readiness.
- `/admin/system` includes weekly backup/export check recording.
- `/admin/system` positions Data Quality Score as a product feature.
- Weekly backup API route exists at `/api/admin/backups/weekly`.
- Weekly backup route requires `CRON_SECRET`.
- Weekly backup route supports optional `BACKUP_POST_URL`.
- Weekly backup route records `SystemCheck` and audit entries.

## Not claimed

- Live tenant test was not run here because it requires a real staging `DATABASE_URL`.
- Live backup restore drill was not run here because it requires staging restore access.
- Production migration repair was not performed.
- Production is intentionally not switched back to `prisma migrate deploy` in this build.

## Remaining required staging work

Before a live PTT pilot generates non-disposable data:

1. Create staging database.
2. Restore/copy production data into staging.
3. Run `pnpm prisma migrate status` against staging.
4. Resolve/baseline failed migration on staging.
5. Run tenant, backup, and forecast tests against staging.
6. Rehearse `prisma migrate deploy` on staging.
7. Record results in `/admin/system`.

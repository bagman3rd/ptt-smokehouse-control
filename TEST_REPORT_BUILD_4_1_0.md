# Test Report — Build 4.1.0

## Scope

Build 4.1.0 implements the data-integrity and DevOps hardening path:

- Active Render build path uses `prisma migrate deploy`.
- The db-push deployment path is removed from package scripts.
- Migration repair and staging runbook is documented.
- Weekly backup cron runner is included.
- Backup restore drill documentation is included.
- `/admin/system` records migration repair, weekly backup, restore drill, tenant, forecast, and backup checks.

## Static evaluation

Command run:

```bash
node scripts/build-4-1-0-evaluation.mjs
```

Result:

```text
Build 4.1.0 evaluation checks completed.
```

## Verified

- `package.json` version is `4.1.0`.
- `render-build` uses `prisma migrate deploy`.
- `render-build` does not use `prisma db push`.
- `render-build` does not use `--accept-data-loss`.
- `db:push` script is removed.
- Weekly backup cron runner exists.
- Optional Render cron job is present in `render.yaml`.
- Weekly backup route requires `CRON_SECRET` and supports `BACKUP_POST_URL`.
- Backup/export payloads identify Build 4.1.0.
- System page shows migration repair gate and data quality positioning.

## Not run in this sandbox

These require a live staging PostgreSQL `DATABASE_URL`:

```bash
pnpm run test:tenant
pnpm run test:backup
pnpm run test:forecast
```

## Deployment warning

Build 4.1.0 should not be deployed to the existing production database until the failed migration state has been repaired or baselined on staging and then repaired on production during a low-traffic window.

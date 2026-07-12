# Build 3.6.0 Pilot Control Center Notes

Build 3.6.0 adds the operational controls needed before the app is used beyond the current controlled PTT pilot.

## System Health
`/admin/system` shows app version, DB connection status, tenant count, active smoker count, latest EOD, latest cook plan, audit activity, and pending learning recommendations.

## Migration Mode
The app intentionally remains in DB Push Recovery Mode because the existing Render database has a failed Prisma migration history. Before paid external customers, rehearse migration baselining against staging and then switch to tracked migrations.

## Staging tests
Run these against a staging PostgreSQL database:

```bash
DATABASE_URL="postgres://...staging..." pnpm run test:tenant
DATABASE_URL="postgres://...staging..." pnpm run test:backup
pnpm run test:forecast
```

## Smoker capacity
`/admin/smokers` captures smoker capacity by protein. Dashboard alerts now warn when a current cook plan exceeds entered smoker capacity.

## Learning approval
Learning recommendations can be saved to a review queue and accepted/rejected by Admin/Owner. Build 3.6.0 audits the decision but does not automatically change forecast settings yet.

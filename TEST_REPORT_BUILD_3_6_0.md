# PTT Smokehouse Control — Build 3.6.0 Test Report

## Scope
Build 3.6.0 is the Pilot Control Center release.

## Added
- Admin-only `/admin/system` health page.
- Admin-only `/admin/smokers` smoker capacity foundation.
- Dashboard smoker capacity alerts.
- Learning recommendation review queue.
- Accept/reject learning recommendation actions with audit log entries.
- Expanded audit logging for settings changes.
- Pilot Mode / DB Push Recovery Mode visibility.
- Staging test instructions surfaced inside the app.

## Static evaluation
- Version updated to `3.6.0`.
- Nav badge updated to `Build 3.6.0`.
- System Health nav and page present.
- Smoker Capacity nav and page present.
- Prisma schema includes Smoker and LearningRecommendation.
- Learning page includes Recommendation Approval Queue.
- Dashboard checks smoker capacity against current cook plan.
- Render build remains on db-push recovery path and does not use `--accept-data-loss`.

## Not run here
- `pnpm run test:tenant` against a real staging PostgreSQL URL.
- `pnpm run test:backup` against a real staging PostgreSQL URL.
- Full Render production deployment.

Those must still be run against a real staging DATABASE_URL before adding outside paid customers.

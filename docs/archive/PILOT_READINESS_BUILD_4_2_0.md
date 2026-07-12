# Pilot Readiness — Build 4.2.0

Build 4.2.0 is intended to close the biggest remaining pilot risk: database migration integrity.

## Ready after these are complete

- Production backup restored to staging.
- Staging migration state repaired or baselined.
- Staging deploy works with `prisma migrate deploy`.
- `test:tenant` passes against staging.
- `test:forecast` passes.
- `test:backup` passes.
- App click-through passes against staging data.
- Backup restore drill is completed and recorded as PASS.
- Fresh production backup is taken.
- Production migration state is repaired during a low-traffic window.
- Build 4.2.0 deploys to production with `prisma migrate deploy`.

## Still not solved by this build

- Rate limiting is still in-memory and should move to Redis/Upstash before multi-instance scaling.
- Weekly backup automation needs real storage or a configured `BACKUP_POST_URL` to be truly durable.
- Full POS API integration is still deferred.
- Billing/Stripe remains deferred until a paying prospect is ready.

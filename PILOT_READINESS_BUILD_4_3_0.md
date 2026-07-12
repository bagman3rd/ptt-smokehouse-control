# Pilot Readiness — Build 4.3.1

Build 4.3.1 raises tenant isolation and account security readiness.

## Must run after staging deploy

1. Deploy to staging with a staging `DATABASE_URL`.
2. Run:

```bash
pnpm run test:tenant
pnpm run test:cross-tenant
pnpm run test:forecast
pnpm run test:backup
```

3. Click through:

- `/today`
- `/dashboard`
- `/cook-plan`
- `/end-of-day`
- `/reports`
- `/learning`
- `/admin/system`
- `/admin/users`

4. Record passing SystemChecks for:

- Tenant isolation test
- Cross-tenant regression test
- Forecast engine test
- Backup export test
- Backup restore drill

## Status

Code changes are included. External staging verification still has to be run in Render.

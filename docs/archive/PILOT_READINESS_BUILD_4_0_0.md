# Build 4.2.0 Pilot Readiness Notes

Build 4.2.0 concentrates remaining pilot risk into a visible operating plan:

- Migration repair runbook added.
- System page now surfaces migration-repair requirements.
- Weekly backup automation endpoint added for Render Cron or another scheduler.
- Data Quality Score is explicitly positioned as an operating-control feature, not just an admin metric.
- Render remains in db-push recovery mode until staging migration repair passes.

Before live PTT pilot data accumulates, complete:

1. Staging database copy.
2. Tenant isolation test.
3. Backup export test.
4. Restore drill.
5. Migration baseline repair rehearsal.
6. Staging deploy using `prisma migrate deploy`.

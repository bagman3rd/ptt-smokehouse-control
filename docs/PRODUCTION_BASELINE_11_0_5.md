# Production Baseline Record — Build 11.0.5

## Identity

- Release commit:
- Render web-service deploy:
- Blueprint sync:
- Database resource:
- Verified by:
- Verification date/time:
- Time zone:

## Resource inventory

| Resource | Expected name | Status | Revision/configuration evidence |
|---|---|---|---|
| Web | ptt-smokehouse-control |  |  |
| Cron | ptt-smokehouse-control-weekly-backup |  |  |
| Cron | ptt-smokehouse-control-daily-retention |  |  |
| Cron | ptt-smokehouse-control-daily-digest |  |  |
| PostgreSQL | ptt-smokehouse-control-db |  |  |

## Smoke-test evidence

| Check | Expected | Actual | Pass/Fail | Evidence |
|---|---|---|---|---|
| Public application | Loads without server error |  |  |  |
| Login | Authorized user signs in |  |  |  |
| Database | Database-backed view loads |  |  |  |
| Today | Today route loads |  |  |  |
| Health | Build 11.0.5 shown |  |  |  |
| Revision | Exact Git SHA shown |  |  |  |
| Logs | No new P0/P1 error |  |  |  |

## Backup evidence

- Backup initiated:
- Backup completed:
- Artifact/result identifier:
- Verification method:
- Retention destination:
- Notes:

## Known-good rollback

- Build 11.0.4 commit:
- Rollback owner:
- Rollback trigger:
- Rollback steps reviewed:

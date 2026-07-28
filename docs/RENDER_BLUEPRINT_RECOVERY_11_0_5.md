# Render Blueprint Recovery — Build 11.0.5

## Root cause addressed

The failed Blueprint sync used the legacy PostgreSQL plan name `starter` under `databases[0].plan`. Build 11.0.5 changes the database to `basic-256mb` while retaining `starter` for the Node web service and cron jobs.

## Controlled declarations

| Resource | Build 11.0.5 |
|---|---|
| Web service | `runtime: node`, `plan: starter` |
| Weekly backup cron | `runtime: node`, `plan: starter` |
| Daily retention cron | `runtime: node`, `plan: starter` |
| Daily digest cron | `runtime: node`, `plan: starter` |
| PostgreSQL | `plan: basic-256mb` |

## Sync procedure

1. Verify the release commit exists on GitHub `main`.
2. Confirm GitHub Actions is green for that commit.
3. Open the Render Blueprint sync list.
4. Start one manual sync only if no automatic sync starts.
5. Verify the sync identifies the new Build 11.0.5 commit.
6. Review proposed resource changes.
7. Stop if Render proposes deleting or unexpectedly recreating the web service, cron jobs or database.
8. Verify every resource separately after the sync.

An older failed sync remains historical. Release status is determined by the newest sync and its commit SHA.

Record a current backup before approving a database-plan movement. Do not delete and recreate the database as a troubleshooting shortcut.

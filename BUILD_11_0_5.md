# PTT Smokehouse Control — Build 11.0.5

## Infrastructure Recovery and Baseline Verification

Build 11.0.5 is a patch release based on the deployed Build 11.0.4 application.

### In scope

- Replace the legacy PostgreSQL Blueprint plan `starter` with `basic-256mb`.
- Replace discouraged `env: node` declarations with `runtime: node`.
- Explicitly declare the `starter` plan for the web service and all three cron jobs.
- Set `APP_BUILD_VERSION` to `11.0.5`.
- Correct the AI warning threshold so the $1.00 warning occurs below the $2.00 daily cap.
- Add a dependency-free Blueprint contract-verification script.
- Add deployment, rollback, smoke-test, backup-verification and release-sign-off instructions.

### Out of scope

- No product features.
- No Prisma schema or migration changes.
- No dependency changes.
- No authentication, forecasting, smoker scheduling, EOD or POS behavior changes.
- No automatic migration command was added to `render.yaml`.

### Release acceptance

Build 11.0.5 is accepted only when the exact release commit has green CI, the newest Render Blueprint sync is green, the web service and cron jobs are healthy, PostgreSQL is available, a backup is verified, the live health endpoint reports Build 11.0.5 and the deployed Git revision, the production smoke test passes, and no P0/P1 infrastructure defect remains.

### Rollback

The prior known-good application revision is Build 11.0.4. Do not delete the database or recreate resources as a rollback method. Redeploy the known-good Build 11.0.4 commit if application deployment fails. Treat a database-plan movement as a separate infrastructure change.

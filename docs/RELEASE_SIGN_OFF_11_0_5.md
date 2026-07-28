# Build 11.0.5 Release Sign-Off

## Release identity

- Build: 11.0.5
- Baseline: deployed Build 11.0.4
- Commit SHA:
- GitHub Actions run:
- Render Blueprint sync:
- Deployment date:
- Release approver:

## Package and configuration

- [ ] Overlay was applied to the complete Build 11.0.4 repository.
- [ ] Existing application source was not deleted.
- [ ] `node scripts/verify-build-11.0.5.mjs` passed.
- [ ] `render.yaml` uses `runtime: node` for all four services.
- [ ] Web service and all three cron jobs use `plan: starter`.
- [ ] PostgreSQL uses `plan: basic-256mb`.
- [ ] `APP_BUILD_VERSION` is `11.0.5`.
- [ ] AI warning threshold is 100 cents and daily cap is 200 cents.
- [ ] No migration, dependency or product-feature change is included.

## CI and Blueprint

- [ ] GitHub Actions passed for the exact release commit.
- [ ] New Blueprint sync references the exact release commit.
- [ ] New Blueprint sync completed successfully.
- [ ] Render did not propose an unintended resource deletion or recreation.
- [ ] Web service is healthy.
- [ ] Weekly backup cron is healthy.
- [ ] Daily retention cron is healthy.
- [ ] Daily digest cron is healthy.
- [ ] PostgreSQL is available.

## Production verification

- [ ] Application opens.
- [ ] Login succeeds.
- [ ] Database-backed page loads.
- [ ] Today page loads.
- [ ] One non-destructive authenticated validation/API check succeeds.
- [ ] Health/status endpoint reports Build 11.0.5.
- [ ] Health/status endpoint reports the expected Git revision.
- [ ] No new critical server or browser-console error appears.
- [ ] No tenant-isolation or authorization regression appears.

## Backup and recovery

- [ ] Production backup was created.
- [ ] Backup result/artifact identifier was recorded.
- [ ] Backup verification completed.
- [ ] Prior known-good Build 11.0.4 commit was recorded.
- [ ] Application rollback procedure was reviewed.
- [ ] Database-plan change implications were acknowledged.

## Decision

- [ ] APPROVE
- [ ] REJECT
- [ ] RETEST REQUIRED

Build 11.0.5 may be approved only with no open P0/P1 infrastructure defect and objective evidence tied to the exact deployed revision.

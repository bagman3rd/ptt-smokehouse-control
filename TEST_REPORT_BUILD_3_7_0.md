# PTT Smokehouse Control — Build 3.8.0 Test Report

## Scope
Build 3.8.0 focuses on controlled learning and production-readiness:

- Accepted learning recommendations update settings.
- Before/after preview and confirmation before applying changes.
- Confidence levels and minimum sample-size rules.
- Rollback support for accepted recommendations.
- Forecast accuracy report.
- Smoker-capacity warning before plan generation.
- Expanded audit log with before/after values.

## Static Evaluation
Command run:

```bash
node scripts/build-3-8-0-evaluation.mjs
```

Result:

```text
Build 3.8.0 evaluation checks completed.
```

## Verified Checks

- package.json version is `3.8.0`.
- Nav badge shows `Build 3.8.0`.
- `LearningRecommendation` stores confidence, sample count, minimum sample count, applied/rollback timestamps, and setting key.
- Learning actions can apply accepted recommendations to settings.
- Learning actions can roll back applied recommendations.
- Apply/rollback actions write audit log entries with before/after values.
- Learning page includes a forecast accuracy report.
- Learning page displays confidence and minimum sample-size thresholds.
- Pending recommendations include before/after preview and explicit Confirm Apply.
- Applied recommendations expose rollback action.
- Cook Plan form checks smoker capacity before generating the plan.
- Capacity preview route projects load units and compares them against active smoker capacity.
- Existing settings actions preserve before/after audit logging.

## Not Run Here

The following still require a live staging database:

```bash
DATABASE_URL="postgres://...staging..." pnpm run test:tenant
DATABASE_URL="postgres://...staging..." pnpm run test:backup
pnpm run test:forecast
```

## Deployment Note

Build 3.8.0 keeps the current db-push recovery path and does not use `--accept-data-loss`.

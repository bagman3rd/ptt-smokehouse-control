# Build 6.1.0 — CI Reliability Fix

Build 6.1.0 corrects the GitHub Actions packaging defect in Build 6.0.0.

## Fixes

- Includes `.github/workflows/ci.yml` in the downloadable project.
- Replaces the stale Build 5.9.3 workflow with **Build 6.1.0 CI**.
- Uses a fresh PostgreSQL 16 service for every CI run.
- Applies the real Prisma migration chain with `prisma migrate deploy`.
- Runs migration integrity, status, and schema-drift checks.
- Runs typecheck, lint, regression tests, Build 6.1.0 evaluation, and the production Next.js build.
- Uses `npm install` so the workflow does not fail when a lockfile is absent from the inherited source package.
- Adds concurrency cancellation so obsolete runs do not continue after a newer push.

This workflow should replace the old workflow when the project is copied into the GitHub repository with hidden files included.

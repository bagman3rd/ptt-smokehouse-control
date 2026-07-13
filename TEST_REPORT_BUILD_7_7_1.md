# Build 7.7.2 local verification

## Confirmed root cause

The GitHub Actions job failed at `Install exact locked dependencies`. The project pinned Node 20.18.1, while the frozen lockfile contains `eslint-visitor-keys@5.0.1`, which requires `^20.19.0 || ^22.13.0 || >=24`. With `engine-strict=true`, installation must fail.

## Repairs verified locally

- package version: 7.7.2
- Node engine: 22.x
- `.node-version`: 22.16.0
- `.nvmrc`: 22.16.0
- GitHub Actions Node: 22.16.0
- frozen lockfile retained
- pre-install Node/lockfile compatibility check passes
- release evaluation updated to validate the actual client dropdown implementation
- Build 7.7.0 schema migration and tenant-scoped EOD upsert retained
- no migration history changed

Full dependency installation and GitHub-hosted runtime testing must execute in GitHub Actions.

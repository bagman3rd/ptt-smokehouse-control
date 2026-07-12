# Smokehouse Control — Build 6.4.0

Build 6.4.0 is a release-engineering reliability update. It commits the dependency lockfile, requires frozen installs, removes the temporary lockfile bootstrap workflow, hardens tenant-boundary browser assertions, sanitizes public health failures, verifies the deployed build, and performs an authenticated production smoke transaction.

## Deployment

Render and GitHub Actions must use `pnpm install --frozen-lockfile`. Configure these GitHub Actions secrets for the hourly production monitor:

- `PRODUCTION_SMOKE_USERNAME`
- `PRODUCTION_SMOKE_PASSWORD`

The account should be a dedicated low-privilege active user with access only to the production restaurant used for monitoring.

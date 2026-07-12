# Build 6.4.0 — Release Engineering Closure

- Commits a real pnpm 9 lockfile generated from the exact package manifest.
- Removes the temporary lockfile bootstrap workflow.
- Makes CI fail immediately when the lockfile is absent.
- Requires frozen dependency installation.
- Returns HTTP 404 for authenticated attempts to load another tenant's cook plan.
- Removes raw database error text from the public health endpoint.
- Verifies deployed build 6.4.0 during hourly monitoring.
- Adds an authenticated login and dashboard smoke transaction.
- Removes obsolete release archives from the deployable ZIP.

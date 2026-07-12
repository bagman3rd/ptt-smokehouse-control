# Build 6.2.1 — GitHub Actions startup repair

Build 6.2.0 enabled pnpm dependency caching in `actions/setup-node`, but the repository did not contain a `pnpm-lock.yaml`. GitHub Actions requires a recognized lockfile to initialize pnpm caching, so the workflow could fail before dependency installation or application tests began.

## Changes

- Removed `cache: pnpm` until a genuine `pnpm-lock.yaml` is committed.
- Kept pnpm 9.15.0 as the single package manager.
- Added explicit Node and pnpm version output.
- Split the large quality command into named CI stages so future failures identify the exact subsystem.
- Removed release numbers from CI-only test secrets.
- Made Playwright report upload safe when a failure occurs before a report directory exists.
- Updated application and workflow versions to 6.2.1.

This release does not alter production data or add a database migration.

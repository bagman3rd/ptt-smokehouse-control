# Build 6.2.0 — Release Reliability

Build 6.2.0 removes permanent migration-history rewriting from normal deploys, standardizes dependency installation on pnpm, runs Playwright against the production server in both desktop and mobile projects, and adds a complete kitchen workflow test covering smoker setup, plan generation, manager override, EOD closeout, prior-day leftover credit, audit evidence, and anonymous tenant-route rejection.

The former migration reconciliation utility remains available only as the explicit one-time command `pnpm run repair:migrations:6.1.1`; Render never calls it automatically.

Catalog cook windows are cleared because manufacturer catalog entries must not determine restaurant operating availability. Installed smokers require an explicit controlled Cook Window selection; server fallback is `INACTIVE`, not `FLEXIBLE`.

## Lockfile status

A complete `pnpm-lock.yaml` could not be generated in the build sandbox because the npm registry was unreachable. CI and Render therefore remain on non-frozen pnpm installation in this ZIP so the release does not fail immediately. Generate and commit the lockfile from a registry-connected machine, then change both install commands to `--frozen-lockfile`.

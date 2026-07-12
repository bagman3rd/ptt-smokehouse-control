# Build 6.3.4 — Lockfile Bootstrap Workflow Fix

Build 6.3.4 fixes the GitHub Actions workflow validation failure that produced “No jobs were run” emails.

## Correction

- Removed the unsupported job-level `hashFiles()` condition.
- The workflow now starts normally, checks for `pnpm-lock.yaml` after repository checkout, and exits successfully when the file already exists.
- pnpm and Node setup, lockfile generation, and commit steps run only when the lockfile is missing.
- The commit step safely exits when no lockfile change was produced.
- Removed the redundant `workflow_run` CI trigger. The lockfile commit itself triggers the normal push-based CI workflow.
- Added workflow concurrency protection to cancel obsolete bootstrap runs.

No application behavior, database schema, or production data is changed in this patch.

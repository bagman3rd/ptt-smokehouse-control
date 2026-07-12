# Build 6.3.0 — Reliability Completion

No product features were added. This release completes reliability work around deterministic dependency locking, smoker configuration review, legacy data safety, database tenant ownership, authenticated tenant isolation, stable browser selectors, repository hygiene, monitoring, and migration smoke checks.

## Lockfile bootstrap
The source environment used to create this release cannot reach npm. A dedicated GitHub workflow generates the real `pnpm-lock.yaml` from the exact package manifest and commits it automatically on the first push when it is absent. The subsequent commit triggers frozen-lockfile CI and Render deployment.

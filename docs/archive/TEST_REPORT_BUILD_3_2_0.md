# TEST REPORT — Build 3.2.0

## Scope

Build 3.2.0 addresses the remaining Build 3.1.0 commercial-readiness gaps:

- Add true Postgres tenant-isolation integration tests.
- Convert restaurant setup from a checklist to form-by-form onboarding.
- Make `RestaurantMembership.role` the required runtime permission source.
- Remove email as a database-level unique constraint and make login safe when duplicate emails exist.
- Add migration-baseline tooling without prematurely switching production Render to `migrate deploy`.

## Automated static evaluation

Command run:

```bash
node scripts/build-3-2-evaluation.mjs
```

Result:

```text
Build 3.2.0 evaluation checks completed.
```

## Checks passed

- `package.json` version is `3.2.0`.
- Navigation badge shows `Build 3.2.0`.
- `RestaurantMembership` and `AuditLog` models exist.
- `email` is no longer database-level unique.
- Runtime auth requires an active `RestaurantMembership`.
- Runtime tenant helper no longer creates access from `User.role` fallback.
- Setup wizard has real forms for profile, forecast model, protein specs, and curves.
- Setup wizard saves audit events for each step.
- Login handles non-unique email safely by using username first and only allowing email login when it resolves to one active user.
- `scripts/tenant-integration-test.mjs` exists for real Postgres isolation testing.
- `test:tenant` package script exists.
- Migration-ready render script exists but is not used as the active Render build command yet.
- Migration baseline safety plan exists.

## Postgres integration test

Added but not run in this sandbox because it requires a live PostgreSQL `DATABASE_URL` with Prisma dependencies installed:

```bash
pnpm run test:tenant
```

The test creates two throwaway restaurants, users, memberships, proteins, scenarios, and cook plans, then verifies tenant-scoped queries do not cross-contaminate.

## Recommendation

Run `pnpm run test:tenant` against a staging Render PostgreSQL database before onboarding any second real restaurant.

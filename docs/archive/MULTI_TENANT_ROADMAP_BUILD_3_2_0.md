# Multi-Tenant Roadmap — Build 3.2.0

## Completed in 3.2.0

- Membership role is now required for active login/session use.
- Setup wizard is now form-by-form instead of only a checklist.
- Tenant-isolation integration test script exists.
- Email is no longer database-level unique.
- Login now prefers username and treats duplicate-email login as invalid.
- Migration-baseline plan and migrate-ready build script added.

## Still not final commercial SaaS

- The legacy `User.role` column remains in the schema for safe upgrade compatibility, but it is no longer the runtime permission source.
- True account/profile separation should still be added later.
- Production Render still uses `prisma db push`; do not switch to migrations until the DB is baselined in staging.
- Tenant integration test must be run against staging PostgreSQL, not just statically inspected.

## Recommended Build 3.3.0

- Add an Account model and separate restaurant-local StaffProfile.
- Add full tenant-aware audit filtering and export.
- Add invitation flow for new users.
- Add wizard completion status per restaurant.
- Add staging migration baseline and switch staging to `prisma migrate deploy`.

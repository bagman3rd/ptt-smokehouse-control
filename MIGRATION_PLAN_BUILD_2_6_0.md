# Migration plan — Build 2.6.0

Build 2.6.0 does not force a migration cutover because the current Render database was created and evolved with `prisma db push`. Switching blindly to `prisma migrate deploy` can fail if the migration history table does not match the existing schema.

## Before live service data

1. Back up the Render PostgreSQL database.
2. Confirm local Prisma schema matches production:
   ```bash
   pnpm prisma db pull
   pnpm prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script
   ```
3. Create a baseline migration from the current schema.
4. Mark that baseline as applied against the existing production database.
5. Change the Render build script to:
   ```bash
   prisma generate && prisma migrate deploy && tsx prisma/seed.ts && next build
   ```
6. Use real migrations for every future schema change.

## Current MVP state

- `--accept-data-loss` is not used.
- `prisma db push` is still used in the MVP Render build to avoid bricking the existing test database before a proper baseline step.
- Do not rely on `db push` once PTT is saving data you cannot afford to lose.

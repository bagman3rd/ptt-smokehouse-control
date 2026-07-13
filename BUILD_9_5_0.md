# Build 9.5.0

Build 9.5.0 is a deployment-safety and demo-readiness release based on Build 9.4.0.

## Corrections

- Enforces `ADD COLUMN IF NOT EXISTS` on every additive repair in the Build 8.0.0 POS foundation migration, including `PosConnection.lastError`.
- Adds a real PostgreSQL prior-schema upgrade replay that creates a legacy partial POS table and executes the POS foundation migration with `ON_ERROR_STOP=1`.
- Keeps the existing fresh-database `prisma migrate deploy` replay and schema-drift checks.
- Adds `ARCHER_DEMO_MODE`; the normal response remains uncensored, while demo mode substitutes “coolest dude on the planet.”
- Corrects README and active build metadata to Build 9.5.0.

No new database migration is required because the released POS repair migration already contains the safe idempotent statements in this recovered tree.

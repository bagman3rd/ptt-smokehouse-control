# Build 7.2.1 — Legacy POS Compile Repair

Build 7.2.1 fixes a Render TypeScript compilation failure caused by an obsolete repository file that referenced `prisma.posConnection`, although no `PosConnection` model exists in the current Prisma schema.

## Correction

- Added a compatibility shim at `app/admin/restaurants/pos/integrationActions.ts` so copying this release over an existing repository overwrites the stale implementation.
- The supported POS workflow remains CSV import and menu-item mapping through `app/admin/restaurants/pos/actions.ts`.
- Added an automated unsupported-Prisma-delegate scan to CI.
- Updated active version references to 7.2.1.
- No database migration or production-data change.

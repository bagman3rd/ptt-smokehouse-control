# Build 7.8.4 Test Report

## Defect addressed

Quick EOD failed on the deployed PostgreSQL database with error `22P03` under both Prisma `upsert` and `createMany`. That behavior isolates the root cause to database column-type drift rather than the Prisma operation shape.

## Corrective action

- Added a migration that normalizes all seven EOD quantity columns to `DOUBLE PRECISION` with explicit `USING ...::double precision` casts.
- Retained tenant-scoped `createMany(skipDuplicates: true)` and `updateMany` writes.
- Added a schema/migration type-contract test to CI.

## Local structural validation

- Package version and visible build labels: pass
- Migration folder integrity: pass
- Prisma Float/schema alignment: pass
- Explicit cast coverage for all EOD numeric columns: pass
- Quick EOD write-strategy contract: pass
- Flat ZIP layout: pass

Runtime database migration and browser submission must complete in Render/GitHub CI against PostgreSQL.

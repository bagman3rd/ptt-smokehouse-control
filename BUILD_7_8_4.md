# Build 7.8.4

Build 7.8.4 repairs PostgreSQL error `22P03: incorrect binary data format in bind parameter` during Quick EOD saves by normalizing every `EndOfDayProteinLog` quantity column to `DOUBLE PRECISION` through an explicit Prisma migration.

The error persisted across both `upsert` and `createMany`, proving the write operation was not the root cause. The deployed database had column-type drift from the Prisma schema. Migration `20260712001400_build_784_eod_numeric_type_repair` safely casts existing values and aligns the live database with Prisma `Float` fields.

The tenant-safe `createMany(skipDuplicates) + updateMany` strategy remains in place. A permanent contract test now verifies both the Prisma schema and corrective migration.

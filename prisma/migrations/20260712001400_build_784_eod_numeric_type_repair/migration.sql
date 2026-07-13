-- Build 7.8.4: normalize production EndOfDayProteinLog quantity columns.
-- Some long-lived databases received these columns through db push or older schema states
-- with integer/numeric types. Prisma's Float bindings then fail with PostgreSQL 22P03.
-- Explicit USING casts make the migration safe for INTEGER, NUMERIC, REAL, or DOUBLE PRECISION sources.
ALTER TABLE "EndOfDayProteinLog"
  ALTER COLUMN "cookedUnits" TYPE DOUBLE PRECISION USING "cookedUnits"::double precision,
  ALTER COLUMN "soldCookedLb" TYPE DOUBLE PRECISION USING "soldCookedLb"::double precision,
  ALTER COLUMN "usableLeftoverLb" TYPE DOUBLE PRECISION USING "usableLeftoverLb"::double precision,
  ALTER COLUMN "usableLeftoverUnits" TYPE DOUBLE PRECISION USING "usableLeftoverUnits"::double precision,
  ALTER COLUMN "sealedUnopenedUnits" TYPE DOUBLE PRECISION USING "sealedUnopenedUnits"::double precision,
  ALTER COLUMN "openedMeatLb" TYPE DOUBLE PRECISION USING "openedMeatLb"::double precision,
  ALTER COLUMN "wasteLb" TYPE DOUBLE PRECISION USING "wasteLb"::double precision;

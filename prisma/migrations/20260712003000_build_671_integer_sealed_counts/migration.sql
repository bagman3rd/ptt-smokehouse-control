-- Build 6.7.1: sealed/unopened meat inventory is counted in whole units.
UPDATE "EndOfDayProteinLog"
SET "sealedUnopenedUnits" = ROUND("sealedUnopenedUnits")
WHERE "sealedUnopenedUnits" <> ROUND("sealedUnopenedUnits");

ALTER TABLE "EndOfDayProteinLog"
  ALTER COLUMN "sealedUnopenedUnits" TYPE INTEGER
  USING ROUND("sealedUnopenedUnits")::INTEGER;

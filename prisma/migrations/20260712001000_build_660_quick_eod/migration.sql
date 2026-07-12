-- Build 6.6.1: simple eight-number kitchen EOD closeout.
ALTER TABLE "EndOfDayProteinLog"
  ADD COLUMN IF NOT EXISTS "sealedUnopenedUnits" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "openedMeatLb" DOUBLE PRECISION NOT NULL DEFAULT 0;

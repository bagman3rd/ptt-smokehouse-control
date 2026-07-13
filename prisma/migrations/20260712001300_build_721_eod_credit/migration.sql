-- Build 7.2.1: preserve whole-number sealed inventory and repair EOD cook-plan credit.
ALTER TABLE "EndOfDayProteinLog"
  ALTER COLUMN "sealedUnopenedUnits" TYPE INTEGER
  USING ROUND("sealedUnopenedUnits")::INTEGER;

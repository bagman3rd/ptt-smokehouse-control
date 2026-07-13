-- Build 7.7.0: tenant-scoped Quick EOD upsert key
CREATE UNIQUE INDEX IF NOT EXISTS "EndOfDayProteinLog_restaurantId_endOfDayLogId_proteinId_key"
ON "EndOfDayProteinLog"("restaurantId", "endOfDayLogId", "proteinId");

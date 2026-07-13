# Build 7.8.4

## PostgreSQL Quick EOD write correction

Build 7.8.4 replaces the `EndOfDayProteinLog.upsert` compound-key write that produced PostgreSQL error `22P03: incorrect binary data format in bind parameter` on the deployed database.

The write path now:

1. Uses tenant-scoped `createMany(..., skipDuplicates: true)` to insert missing protein rows safely.
2. Uses tenant-scoped `updateMany` for every protein row.
3. Retains the database unique constraint on `(restaurantId, endOfDayLogId, proteinId)`.
4. Remains safe for concurrent first saves and revisions.
5. Keeps the production tenant guard enabled without bypassing or weakening it.

Also preserved: Build 7.8.2 compile fix, Build 7.8.1 Admin navigation policy, EOD Draft→revise→Complete→Lock lifecycle, and all prior carryover rules.

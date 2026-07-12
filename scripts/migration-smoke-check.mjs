import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
try {
  const requiredTables = ['Restaurant','Protein','CookPlan','CookPlanItem','EndOfDayLog','EndOfDayProteinLog','Smoker','AuditLog','UserSession'];
  const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
  const names = new Set(tables.map((row) => row.table_name));
  for (const table of requiredTables) {
    if (!names.has(table)) throw new Error(`Migration smoke check: missing table ${table}`);
  }
  const nullable = await prisma.$queryRaw`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('Protein','CookPlan','CookPlanItem','EndOfDayLog','EndOfDayProteinLog','Smoker','AuditLog')
      AND column_name = 'restaurantId'
      AND is_nullable <> 'NO'`;
  if (nullable.length) throw new Error(`Migration smoke check: nullable tenant keys remain: ${JSON.stringify(nullable)}`);
  const orphanRows = await prisma.$queryRaw`
    SELECT
      (SELECT COUNT(*) FROM "Protein" WHERE "restaurantId" IS NULL) +
      (SELECT COUNT(*) FROM "CookPlan" WHERE "restaurantId" IS NULL) +
      (SELECT COUNT(*) FROM "CookPlanItem" WHERE "restaurantId" IS NULL) +
      (SELECT COUNT(*) FROM "EndOfDayLog" WHERE "restaurantId" IS NULL) +
      (SELECT COUNT(*) FROM "EndOfDayProteinLog" WHERE "restaurantId" IS NULL) +
      (SELECT COUNT(*) FROM "Smoker" WHERE "restaurantId" IS NULL) +
      (SELECT COUNT(*) FROM "AuditLog" WHERE "restaurantId" IS NULL) AS count`;
  if (Number(orphanRows[0]?.count || 0) !== 0) throw new Error('Migration smoke check: orphan tenant records remain.');
  console.log('Migration smoke check passed.');
} finally {
  await prisma.$disconnect();
}

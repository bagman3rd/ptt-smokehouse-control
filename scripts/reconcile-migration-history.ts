import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const renames: Array<[string, string]> = [
  ['20260712000400_build_530_pos_integration', '20260712000450_build_530_pos_integration'],
  ['20260712000500_build_550_smoker_catalog', '20260712000550_build_550_smoker_catalog'],
  ['20260712000600_build_580_smoker_catalog_units', '20260712000650_build_580_smoker_catalog_units']
];

async function main() {
  for (const [oldName, newName] of renames) {
    const changed = await prisma.$executeRawUnsafe(
      `UPDATE "_prisma_migrations" old SET migration_name = $1 WHERE migration_name = $2 AND NOT EXISTS (SELECT 1 FROM "_prisma_migrations" current WHERE current.migration_name = $1)`,
      newName,
      oldName
    );
    if (changed) console.log(`Reconciled migration history: ${oldName} -> ${newName}`);
  }
}
main().finally(() => prisma.$disconnect());

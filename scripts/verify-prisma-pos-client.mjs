import { Prisma, PrismaClient } from '@prisma/client';

const expectedModels = ['PosConnection', 'PosLocation', 'PosCatalogItem', 'PosSyncRun', 'PosOrderLine'];
const generatedModels = new Set(Prisma.dmmf.datamodel.models.map((model) => model.name));
const missingModels = expectedModels.filter((model) => !generatedModels.has(model));

if (missingModels.length > 0) {
  throw new Error(
    `Generated Prisma Client does not match prisma/schema.prisma. Missing models: ${missingModels.join(', ')}.`
  );
}

// Verify the same delegate TypeScript uses, rather than grepping wrapper .d.ts files.
const prisma = new PrismaClient();
if (!prisma.posConnection || typeof prisma.posConnection.findUnique !== 'function') {
  throw new Error('Generated Prisma Client is missing the prisma.posConnection delegate.');
}
await prisma.$disconnect();

console.log('PASS: generated Prisma Client contains all POS models and the posConnection delegate.');

import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const clientPackage = require.resolve('@prisma/client/package.json');
const clientDir = new URL('.', `file://${clientPackage}`).pathname;

const candidates = [
  `${clientDir}/index.d.ts`,
  `${clientDir}/default.d.ts`,
  'node_modules/.prisma/client/index.d.ts',
  'node_modules/@prisma/client/index.d.ts'
];

const generated = candidates.filter(existsSync).map((file) => readFileSync(file, 'utf8')).join('\n');
if (!generated) {
  throw new Error('Generated Prisma Client type declarations were not found after prisma generate.');
}

if (!generated.includes('posConnection') && !generated.includes('PosConnection')) {
  throw new Error(
    'Generated Prisma Client is stale: PosConnection is missing. Clear the build cache and verify prisma/schema.prisma is present before compilation.'
  );
}

console.log('PASS: generated Prisma Client contains the PosConnection model.');

import fs from 'node:fs';

const required = [
  'lib/posImport.ts',
  'app/admin/restaurants/pos/actions.ts',
  'app/admin/restaurants/pos/page.tsx',
  'app/admin/restaurants/pos/PosImportPreviewForm.tsx',
  'prisma/migrations/20260712000400_build_530_pos_integration/migration.sql',
  'POS_INTEGRATION_BUILD_5_3_0.md',
  'TEST_REPORT_BUILD_5_3_0.md'
];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing required Build 5.3.0 file: ${file}`);
}
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.version !== '5.3.0') throw new Error('package.json must be version 5.3.0');
const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
for (const token of ['model MenuItemMapping', 'model PosImportBatch', 'model PosImportRow']) {
  if (!schema.includes(token)) throw new Error(`Schema missing ${token}`);
}
const page = fs.readFileSync('app/admin/restaurants/pos/page.tsx', 'utf8');
for (const token of ['Menu Item Mapping', 'POS Item-Sales CSV', 'Recent POS Import Batches']) {
  if (!page.includes(token)) throw new Error(`POS page missing ${token}`);
}
console.log('Build 5.3.0 evaluation checks completed.');

import { readFileSync } from 'node:fs';

const lib = readFileSync('lib/posImport.ts', 'utf8');
for (const token of ['parsePosCsv', 'buildPosPreviewRows', 'summarizePosPreview', 'normalizePosItemName']) {
  if (!lib.includes(token)) throw new Error(`POS import library missing ${token}`);
}
const actions = readFileSync('app/admin/restaurants/pos/actions.ts', 'utf8');
for (const token of ['saveMenuItemMapping', 'importPosItemCsv', 'posImportBatch.create', 'posImportRow.createMany']) {
  if (!actions.includes(token)) throw new Error(`POS actions missing ${token}`);
}
console.log('Build 5.3.0 POS import mapping checks completed.');

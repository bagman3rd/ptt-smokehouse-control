import fs from 'node:fs';

const providers = fs.readFileSync('lib/posProviders.ts', 'utf8');
const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
const page = fs.readFileSync('app/admin/restaurants/pos/page.tsx', 'utf8');
const actions = fs.readFileSync('app/admin/restaurants/pos/integrationActions.ts', 'utf8');
const expected = ['CLOVER','TOAST','SQUARE','ORACLE_SIMPHONY','NCR_ALOHA','SPOTON','TOUCHBISTRO','LIGHTSPEED','PAR_BRINK','SHIFT4_REVEL'];
const missing = expected.filter((id) => !providers.includes(`id: '${id}'`));
if (missing.length) throw new Error(`Missing providers: ${missing.join(', ')}`);
for (const model of ['PosConnection','PosLocation','PosCatalogItem','PosSyncRun','PosOrderLine']) {
  if (!schema.includes(`model ${model}`)) throw new Error(`Missing Prisma model ${model}`);
}
for (const required of ['savePosConnection','syncPosConnection','disconnectPosConnection']) {
  if (!actions.includes(`function ${required}`)) throw new Error(`Missing server action ${required}`);
}
if (!page.includes('Top 10 POS Connections')) throw new Error('POS connection dashboard missing.');
if (!actions.includes('connectionId_externalOrderId_externalLineId')) throw new Error('Duplicate-safe order-line key missing.');
console.log('PASS: Build 6.7.1 top-10 POS provider registry, persistence, UI, and duplicate-safe sync are present.');

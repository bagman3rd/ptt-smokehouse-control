#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const pkg=JSON.parse(read('package.json'));
const seed=read('prisma/seed.ts');
const bootstrap=read('lib/bootstrap.ts');
const orphan=read('scripts/orphan-record-check.mjs');
assert.equal(pkg.version,'6.3.3');
for (const source of [seed, bootstrap]) {
  assert(!source.includes('prisma.protein.updateMany({ where: { restaurantId: null }'));
  assert(!source.includes('prisma.cookPlan.updateMany({ where: { restaurantId: null }'));
  assert(!source.includes('prisma.endOfDayLog.updateMany({ where: { restaurantId: null }'));
}
assert(orphan.includes('$queryRawUnsafe'));
assert(read('components/Nav.tsx').includes('Build 6.3.3'));
assert(read('app/api/health/route.ts').includes("build: '6.3.3'"));
console.log('Build 6.3.3 evaluation completed.');

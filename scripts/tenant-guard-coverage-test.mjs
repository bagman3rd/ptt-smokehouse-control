#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
const guard = fs.readFileSync('lib/tenantGuard.ts','utf8');
const schema = fs.readFileSync('prisma/schema.prisma','utf8');
for (const model of ['AuditLog','Protein','CookPlan','CookPlanItem','EndOfDayLog','EndOfDayProteinLog','Smoker','SystemCheck']) assert.ok(guard.includes(`'${model}'`), `guard missing ${model}`);
for (const model of ['CookPlanItem','EndOfDayProteinLog']) {
  const start=schema.indexOf(`model ${model}`); const end=schema.indexOf('\n}',start); const block=schema.slice(start,end);
  assert.ok(block.includes('restaurantId'), `${model} requires restaurantId`);
  assert.ok(block.includes('@@index([restaurantId'), `${model} requires tenant index`);
}
assert.ok(guard.includes("process.env.TENANT_GUARD_ENABLED === '1'"), 'explicit guard enable is required');
assert.ok(guard.includes("process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'"), 'guard must auto-run in dev/test');
assert.ok(guard.includes("process.env.DISABLE_TENANT_GUARD === '1'"), 'maintenance bypass must be explicit');
console.log('Build 7.9.0 tenant guard coverage passed.');

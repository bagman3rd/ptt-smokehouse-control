#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (path) => readFileSync(path, 'utf8');
function roleGuard(file, roles) {
  const source = read(file);
  assert.match(source, /requireApi(?:User)?Role\(/, `${file} must use an API role guard`);
  for (const role of roles) assert.ok(source.includes(`'${role}'`), `${file} must allow ${role}`);
  return source;
}
const actions = read('app/actions.ts');
const approveStart = actions.indexOf('export async function approveCookPlan');
assert.ok(approveStart >= 0, 'approveCookPlan must exist');
const approveEnd = actions.indexOf('export async function', approveStart + 30);
const approve = actions.slice(approveStart, approveEnd > 0 ? approveEnd : actions.length);
for (const role of ['ADMIN','OWNER','KITCHEN_MANAGER']) assert.ok(approve.includes(`'${role}'`), `approveCookPlan must allow ${role}`);
assert.ok(!approve.includes('KITCHEN_CREW'), 'Kitchen Crew must not approve cook plans');
const cookPlan = roleGuard('app/api/cook-plan/route.ts', ['ADMIN','OWNER','KITCHEN_MANAGER']);
assert.ok(!cookPlan.includes("'KITCHEN_CREW'"), 'Cook-plan generation must exclude Kitchen Crew');
roleGuard('app/api/end-of-day/route.ts', ['ADMIN','OWNER','KITCHEN_MANAGER','KITCHEN_CREW']);
for (const file of ['app/api/reports/backup/route.ts','app/api/admin/tenant/export/route.ts','app/api/admin/tenant/delete/route.ts']) {
  const source = roleGuard(file, ['ADMIN','OWNER']);
  assert.ok(!source.includes("'KITCHEN_MANAGER'") && !source.includes("'KITCHEN_CREW'"), `${file} must remain privileged`);
}
console.log('Build 7.6.0 permission contracts passed.');

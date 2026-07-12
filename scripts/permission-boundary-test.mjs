#!/usr/bin/env node
/*
  Static permission-boundary tests for high-risk server actions and API routes.
  These checks are intentionally cheap enough to run on every push in CI.
*/
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(path, 'utf8');
}

function assertContains(file, text, message) {
  assert.ok(read(file).includes(text), message || `${file} should include ${text}`);
}

function assertNotContains(file, text, message) {
  assert.ok(!read(file).includes(text), message || `${file} should not include ${text}`);
}

const actions = read('app/actions.ts');
assert.ok(actions.includes("requireRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER'])"), 'approveCookPlan must be restricted to Admin, Owner, and Kitchen Manager.');
const approveBlock = actions.slice(actions.indexOf('export async function approveCookPlan'), actions.indexOf('export async function updateScenario'));
assert.ok(approveBlock.includes("requireRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER'])"), 'approveCookPlan permission check should be inside approveCookPlan.');
assert.ok(!approveBlock.includes('KITCHEN_CREW'), 'Kitchen Crew must not be able to approve cook plans.');

const settingsActions = ['updateScenario', 'updateProtein', 'updateDayMultiplier', 'updateMonthMultiplier'];
for (const fn of settingsActions) {
  const start = actions.indexOf(`export async function ${fn}`);
  assert.ok(start >= 0, `${fn} should exist.`);
  const endCandidates = settingsActions.concat(['deleteFutureCookPlans']).map((name) => actions.indexOf(`export async function ${name}`, start + 1)).filter((i) => i > start);
  const end = endCandidates.length ? Math.min(...endCandidates) : actions.length;
  const block = actions.slice(start, end);
  assert.ok(block.includes("requireRole(['ADMIN', 'OWNER'])"), `${fn} must be restricted to Admin/Owner.`);
  assert.ok(!block.includes('KITCHEN_MANAGER') && !block.includes('KITCHEN_CREW'), `${fn} must not allow kitchen roles.`);
}

assertContains('app/api/cook-plan/route.ts', "requireApiRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER'])", 'Cook-plan generation API must exclude Kitchen Crew.');
assertNotContains('app/api/cook-plan/route.ts', "'KITCHEN_CREW'", 'Cook-plan generation API must not include Kitchen Crew.');
assertContains('app/api/end-of-day/route.ts', "requireApiRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW'])", 'EOD API should allow Kitchen Crew write access.');
assertContains('app/api/reports/backup/route.ts', "requireApiRole(['ADMIN', 'OWNER'])", 'Full backup export must be Admin/Owner only.');
assertContains('app/api/admin/tenant/export/route.ts', "requireApiRole(['ADMIN', 'OWNER'])", 'Tenant export must be Admin/Owner only.');
assertContains('app/api/admin/tenant/delete/route.ts', "requireApiRole(['ADMIN', 'OWNER'])", 'Tenant deletion/deactivation must be Admin/Owner only.');

console.log('Permission-boundary tests completed. Kitchen Crew cannot approve plans or change admin settings; EOD write access remains allowed.');

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { hasTenantScope, tenantGuardEnabled } from '../lib/tenantGuard';

const restaurantId = 'tenant-a';
const serviceDate = new Date('2031-08-18T00:00:00.000Z');
const endOfDayLogId = 'log-a';
const proteinId = 'protein-a';

const parentUpdateWhere = {
  restaurantId_serviceDate: { restaurantId, serviceDate }
};
const childUpsertWhere = {
  restaurantId_endOfDayLogId_proteinId: { restaurantId, endOfDayLogId, proteinId }
};
const legacyChildWhere = {
  endOfDayLogId_proteinId: { endOfDayLogId, proteinId }
};

assert.equal(hasTenantScope(parentUpdateWhere), true, 'EOD parent update must satisfy the tenant guard');
assert.equal(hasTenantScope(childUpsertWhere), true, 'tenant-scoped child upsert must satisfy the tenant guard');
assert.equal(hasTenantScope(legacyChildWhere), false, 'legacy child upsert key must fail the tenant guard');

const route = fs.readFileSync('app/api/end-of-day/route.ts', 'utf8');
assert.match(route, /endOfDayLog\.update\(\{[\s\S]*?where:\s*\{[\s\S]*?restaurantId_serviceDate:\s*\{[\s\S]*?restaurantId,[\s\S]*?serviceDate/, 'EOD revisions must update the parent through its tenant-scoped compound key');
assert.match(route, /endOfDayProteinLog\.upsert\(\{[\s\S]*?restaurantId_endOfDayLogId_proteinId/, 'EOD child upserts must use the tenant-scoped compound key');

const oldEnabled = process.env.TENANT_GUARD_ENABLED;
const oldDisabled = process.env.DISABLE_TENANT_GUARD;
delete process.env.DISABLE_TENANT_GUARD;
delete process.env.TENANT_GUARD_ENABLED;
assert.equal(tenantGuardEnabled(), true, 'tenant guard must be enabled by default in production');
process.env.DISABLE_TENANT_GUARD = '1';
assert.equal(tenantGuardEnabled(), false, 'controlled maintenance can explicitly disable the guard');
if (oldEnabled === undefined) delete process.env.TENANT_GUARD_ENABLED; else process.env.TENANT_GUARD_ENABLED = oldEnabled;
if (oldDisabled === undefined) delete process.env.DISABLE_TENANT_GUARD; else process.env.DISABLE_TENANT_GUARD = oldDisabled;

console.log('Build 7.8.2 EOD parent/child tenant-guard contract passed.');

import assert from 'node:assert/strict';
import { hasTenantScope } from '../lib/tenantGuard';
const restaurantId='tenant-a', endOfDayLogId='log-a', proteinId='protein-a';
const valid={where:{restaurantId_endOfDayLogId_proteinId:{restaurantId,endOfDayLogId,proteinId}},update:{restaurantId},create:{restaurantId,endOfDayLogId,proteinId}};
const legacy={where:{endOfDayLogId_proteinId:{endOfDayLogId,proteinId}},update:{restaurantId},create:{restaurantId,endOfDayLogId,proteinId}};
assert.equal(hasTenantScope(valid.where),true,'scoped compound key must satisfy guard');
assert.equal(hasTenantScope(legacy.where),false,'legacy compound key must fail guard');
console.log('Build 7.7.1 EOD tenant-guard contract passed.');

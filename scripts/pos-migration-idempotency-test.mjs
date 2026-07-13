import assert from 'node:assert/strict';
import fs from 'node:fs';
const path='prisma/migrations/20260712001500_build_800_pos_integration_foundation/migration.sql';
const sql=fs.readFileSync(path,'utf8');
const adds=[...sql.matchAll(/ALTER TABLE\s+"[^"]+"\s+ADD COLUMN[^;]+;/g)].map(m=>m[0]);
assert.ok(adds.length>50,'expected comprehensive POS schema repair statements');
for(const statement of adds) assert.match(statement,/ADD COLUMN IF NOT EXISTS/,'non-idempotent ADD COLUMN found: '+statement);
assert.match(sql,/ADD COLUMN IF NOT EXISTS "lastError" TEXT/);
console.log(`Build 9.7.0 POS migration idempotency passed for ${adds.length} ADD COLUMN statements.`);

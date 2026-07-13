import fs from 'node:fs';
import assert from 'node:assert/strict';

const migrationPath='prisma/migrations/20260712001500_build_800_pos_integration_foundation/migration.sql';
const migration=fs.readFileSync(migrationPath,'utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const recovery=fs.readFileSync('scripts/prepare-pos-migration-recovery.mjs','utf8');

for (const type of ['PosProvider','PosConnectionStatus','PosSyncStatus']) {
  assert.ok(migration.includes(`CREATE TYPE "${type}"`), `missing ${type}`);
  assert.ok(migration.includes('EXCEPTION WHEN duplicate_object THEN NULL'), 'enum creation must tolerate a partial prior run');
}
for (const table of ['PosConnection','PosSyncRun','PosRawRecord','PosMenuItem','PosOrder','PosLineItem','PosWebhookEvent']) {
  assert.ok(migration.includes(`CREATE TABLE IF NOT EXISTS "${table}"`), `${table} must be idempotent`);
}
for (const column of ['externalLocationId','externalMerchantId','encryptedAccessToken','automaticSyncEnabled','syncTimezone']) {
  assert.ok(migration.includes(`ALTER TABLE "PosConnection" ADD COLUMN IF NOT EXISTS "${column}"`), `partial PosConnection must repair missing ${column}`);
}
assert.ok(migration.indexOf('ADD COLUMN IF NOT EXISTS "externalLocationId"') < migration.indexOf('PosConnection_restaurantId_provider_externalLocationId_key'), 'missing columns must be repaired before indexes are created');
assert.ok(migration.includes('CREATE UNIQUE INDEX IF NOT EXISTS'), 'unique indexes must be idempotent');
assert.ok(migration.includes('CREATE INDEX IF NOT EXISTS'), 'indexes must be idempotent');
assert.ok(recovery.includes('migrate\', \'resolve\', \'--rolled-back\''), 'recovery must resolve only the failed POS migration');
assert.ok(pkg.scripts['render-build'].includes('prepare-pos-migration-recovery.mjs'), 'Render must run migration recovery before migrate deploy');
console.log('Build 9.8.0 POS partial-migration recovery contract passed.');

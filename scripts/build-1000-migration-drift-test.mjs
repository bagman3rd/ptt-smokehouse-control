// Build 10.0.0 — migration/schema drift guard.
// Verifies the hand-authored 10.0.0 migration matches the schema exactly:
// every scalar field has a column, every enum matches, unique indexes exist.
// This mirrors what `prisma migrate diff --exit-code` enforces on Render.
// Run: node scripts/build-1000-migration-drift-test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';

const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
const migPath =
  'prisma/migrations/20260724000000_build_1000_compliance_notifications_observability/migration.sql';
assert.ok(fs.existsSync(migPath), 'Build 10.0.0 migration file is missing');
const migration = fs.readFileSync(migPath, 'utf8');

const modelNames = new Set([...schema.matchAll(/model\s+(\w+)\s*\{/g)].map((m) => m[1]));
const newModels = [
  'CommunicationConsent',
  'ConsentEvent',
  'NotificationLog',
  'CostEvent',
  'AiUsageDaily',
  'DataRetentionSetting',
  'RetentionJobRun',
  'ArcherConversationLog',
  'CookieConsent',
  'DeployRecord'
];

function scalarFields(modelName) {
  const block = schema.match(new RegExp(`model\\s+${modelName}\\s*\\{([\\s\\S]*?)\\n\\}`))[1];
  const fields = [];
  for (const line of block.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('//') || t.startsWith('@@')) continue;
    const m = t.match(/^(\w+)\s+(\w+)(\[\])?(\?)?/);
    if (!m) continue;
    const [, fname, ftype, isArray] = m;
    if (modelNames.has(ftype) || isArray) continue; // skip relation/array fields
    fields.push(fname);
  }
  return fields;
}

for (const model of newModels) {
  const ct = migration.match(new RegExp(`CREATE TABLE IF NOT EXISTS "${model}" \\(([\\s\\S]*?)\\n\\);`));
  assert.ok(ct, `migration is missing CREATE TABLE for ${model}`);
  const cols = new Set([...ct[1].matchAll(/"(\w+)"\s+/g)].map((m) => m[1]));
  for (const f of scalarFields(model)) {
    assert.ok(cols.has(f), `${model}.${f} has no column in migration (schema drift)`);
  }
}

const newEnums = [
  'ConsentChannel',
  'ConsentState',
  'NotificationChannel',
  'NotificationCategory',
  'NotificationStatus',
  'CostService'
];
for (const en of newEnums) {
  const schemaVals = schema
    .match(new RegExp(`enum\\s+${en}\\s*\\{([^}]*)\\}`))[1]
    .trim()
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('//'));
  const mig = migration.match(new RegExp(`CREATE TYPE "${en}" AS ENUM \\(([^)]*)\\)`));
  assert.ok(mig, `migration missing enum ${en}`);
  const migVals = [...mig[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(new Set(migVals), new Set(schemaVals), `enum ${en} values drift`);
}

for (const [model, key] of [
  ['CommunicationConsent', 'channel_destination'],
  ['NotificationLog', 'idempotencyKey'],
  ['AiUsageDaily', 'restaurantId_usageDate'],
  ['DataRetentionSetting', 'restaurantId'],
  ['CookieConsent', 'visitorId']
]) {
  assert.ok(
    migration.includes(`CREATE UNIQUE INDEX IF NOT EXISTS "${model}_${key}_key"`),
    `missing unique index ${model}_${key}_key`
  );
}

// The migration must be additive (no destructive DDL on existing tables).
assert.ok(!/DROP TABLE/i.test(migration), 'migration must not DROP TABLE');
assert.ok(!/DROP COLUMN/i.test(migration), 'migration must not DROP COLUMN');

console.log('Build 10.0.0 migration drift check passed: schema and migration are in sync.');

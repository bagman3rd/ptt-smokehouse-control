// Build 11.0.0 — migration/schema drift guard for new models.
// Mirrors what `prisma migrate diff --exit-code` enforces on Render.
// Run: node scripts/build-1100-migration-drift-test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';

const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
const migPath = 'prisma/migrations/20260725000000_build_1100_error_tracking/migration.sql';
assert.ok(fs.existsSync(migPath), 'Build 11.0.0 migration file is missing');
const migration = fs.readFileSync(migPath, 'utf8');

const modelNames = new Set([...schema.matchAll(/model\s+(\w+)\s*\{/g)].map((m) => m[1]));
const newModels = ['ErrorEvent', 'PaymentEvent'];

function scalarFields(modelName) {
  const block = schema.match(new RegExp(`model\\s+${modelName}\\s*\\{([\\s\\S]*?)\\n\\}`))[1];
  const fields = [];
  for (const line of block.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('//') || t.startsWith('@@')) continue;
    const m = t.match(/^(\w+)\s+(\w+)(\[\])?(\?)?/);
    if (!m) continue;
    const [, fname, ftype, isArray] = m;
    if (modelNames.has(ftype) || isArray) continue;
    fields.push(fname);
  }
  return fields;
}

for (const model of newModels) {
  const ct = migration.match(new RegExp(`CREATE TABLE IF NOT EXISTS "${model}" \\(([\\s\\S]*?)\\n\\);`));
  assert.ok(ct, `migration missing CREATE TABLE for ${model}`);
  const cols = new Set([...ct[1].matchAll(/"(\w+)"\s+/g)].map((m) => m[1]));
  for (const f of scalarFields(model)) {
    assert.ok(cols.has(f), `${model}.${f} has no column in migration (schema drift)`);
  }
}

// Unique idempotency index for payment events (the double-charge guard).
assert.ok(
  migration.includes('CREATE UNIQUE INDEX IF NOT EXISTS "PaymentEvent_stripeEventId_key"'),
  'PaymentEvent stripeEventId unique index missing (idempotency guard)'
);

// Additive only.
assert.ok(!/DROP TABLE/i.test(migration), 'migration must not DROP TABLE');
assert.ok(!/DROP COLUMN/i.test(migration), 'migration must not DROP COLUMN');

console.log('Build 11.0.0 migration drift check passed: schema and migration in sync.');

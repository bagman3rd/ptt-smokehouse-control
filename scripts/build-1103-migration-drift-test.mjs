// Build 11.0.3 — migration/schema drift guard for WebVitalSample.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
const migPath = 'prisma/migrations/20260727000000_build_1103_web_vitals/migration.sql';
assert.ok(fs.existsSync(migPath), 'Build 11.0.3 migration file is missing');
const migration = fs.readFileSync(migPath, 'utf8');

const modelNames = new Set([...schema.matchAll(/model\s+(\w+)\s*\{/g)].map((m) => m[1]));
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

const model = 'WebVitalSample';
const ct = migration.match(new RegExp(`CREATE TABLE IF NOT EXISTS "${model}" \\(([\\s\\S]*?)\\n\\);`));
assert.ok(ct, `migration missing CREATE TABLE for ${model}`);
const cols = new Set([...ct[1].matchAll(/"(\w+)"\s+/g)].map((m) => m[1]));
for (const f of scalarFields(model)) {
  assert.ok(cols.has(f), `${model}.${f} has no column in migration (schema drift)`);
}
assert.ok(!/DROP TABLE/i.test(migration), 'migration must not DROP TABLE');
assert.ok(!/DROP COLUMN/i.test(migration), 'migration must not DROP COLUMN');
console.log('Build 11.0.3 migration drift check passed: schema and migration in sync.');

import fs from 'node:fs';
import assert from 'node:assert/strict';

const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
const migrationPath = 'prisma/migrations/20260712001400_build_784_eod_numeric_type_repair/migration.sql';
assert.ok(fs.existsSync(migrationPath), 'Build 9.4.0 EOD numeric type repair migration is missing');
const migration = fs.readFileSync(migrationPath, 'utf8');

const columns = [
  'cookedUnits',
  'soldCookedLb',
  'usableLeftoverLb',
  'usableLeftoverUnits',
  'sealedUnopenedUnits',
  'openedMeatLb',
  'wasteLb'
];
for (const column of columns) {
  assert.match(schema, new RegExp(`${column}\\s+Float`), `${column} must remain Prisma Float`);
  assert.ok(migration.includes(`ALTER COLUMN "${column}" TYPE DOUBLE PRECISION`), `${column} must be normalized to DOUBLE PRECISION`);
  assert.ok(migration.includes(`"${column}"::double precision`), `${column} migration must use an explicit cast`);
}
console.log('Build 9.4.0 EOD database column type contract passed.');

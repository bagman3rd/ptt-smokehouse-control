import { existsSync, readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const read = (p) => readFileSync(p, 'utf8');
const pkg = JSON.parse(read('package.json'));
assert.equal(pkg.version, '6.5.0');
assert.ok(existsSync('pnpm-lock.yaml'));
assert.ok(!existsSync('scripts/reconcile-migration-history.ts'));
assert.ok(!JSON.stringify(pkg.scripts).includes('repair:migrations'));
for (const name of [
  '20260712000400_build_530_pos_integration','20260712000450_build_530_pos_integration',
  '20260712000500_build_550_smoker_catalog','20260712000550_build_550_smoker_catalog',
  '20260712000600_build_580_smoker_catalog_units','20260712000650_build_580_smoker_catalog_units'
]) assert.ok(existsSync(`prisma/migrations/${name}/migration.sql`), `missing migration compatibility alias ${name}`);
assert.equal(read('prisma/migrations/20260712000400_build_530_pos_integration/migration.sql'), read('prisma/migrations/20260712000450_build_530_pos_integration/migration.sql'));
assert.equal(read('prisma/migrations/20260712000500_build_550_smoker_catalog/migration.sql'), read('prisma/migrations/20260712000550_build_550_smoker_catalog/migration.sql'));
assert.equal(read('prisma/migrations/20260712000600_build_580_smoker_catalog_units/migration.sql'), read('prisma/migrations/20260712000650_build_580_smoker_catalog_units/migration.sql'));
assert.ok(read('.github/workflows/ci.yml').includes('database dump-and-restore drill'));
assert.ok(read('.github/workflows/ci.yml').includes('50-session load smoke test'));
assert.ok(read('app/billing/page.tsx').includes('manual-invoice-policy'));
assert.ok(read('docs/BILLING_POLICY.md').includes('MANUAL_INVOICE'));
assert.ok(read('docs/PILOT_EVIDENCE_CHECKLIST.md').includes('physical kitchen'));
assert.ok(readdirSync('scripts').length < 30, 'active scripts directory should remain below 30 files');
console.log('Build 6.5.0 evaluation passed.');

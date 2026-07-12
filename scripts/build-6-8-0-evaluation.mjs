import { existsSync, readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const read = (p) => readFileSync(p, 'utf8');
const pkg = JSON.parse(read('package.json'));
assert.equal(pkg.version, '6.8.0');
assert.ok(existsSync('pnpm-lock.yaml'));
assert.ok(existsSync('prisma/migrations/20260712001100_build_680_security_sessions/migration.sql'));
const schema = read('prisma/schema.prisma');
assert.ok(schema.includes('model UserSession'));
assert.ok(schema.includes('sessions     UserSession[]'));
const auth = read('lib/auth.ts');
assert.ok(auth.includes('privilegedTwoFactorRequired'));
assert.ok(auth.includes('prisma.userSession.findFirst'));
assert.ok(auth.includes('prisma.userSession.create'));
assert.ok(auth.includes('Two-factor authentication is required for privileged access'));
const securityPage = read('app/account/security/page.tsx');
assert.ok(securityPage.includes('Active Sessions and Devices'));
assert.ok(securityPage.includes('revokeSession'));
assert.ok(read('app/reports/page.tsx').includes('multi-store-rollup'));
assert.ok(read('e2e/load-smoke.spec.ts').includes('LOAD_SMOKE_CONCURRENCY || 200'));
assert.ok(read('.github/workflows/ci.yml').includes('LOAD_SMOKE_CONCURRENCY: 200'));
assert.ok(read('app/admin/system/page.tsx').includes('REAL_DEVICE_KITCHEN_TEST'));
assert.ok(read('app/admin/system/page.tsx').includes('OPERATOR_RESTORE_REHEARSAL'));
assert.ok(read('app/admin/system/page.tsx').includes('LIVE_PILOT_DATA_REVIEW'));
assert.ok(read('app/admin/system/page.tsx').includes('External security review'));
for (const name of [
  '20260712000400_build_530_pos_integration','20260712000450_build_530_pos_integration',
  '20260712000500_build_550_smoker_catalog','20260712000550_build_550_smoker_catalog',
  '20260712000600_build_580_smoker_catalog_units','20260712000650_build_580_smoker_catalog_units'
]) assert.ok(existsSync(`prisma/migrations/${name}/migration.sql`), `missing migration compatibility folder ${name}`);
assert.ok(readdirSync('scripts').length < 30);
assert.ok(existsSync('app/end-of-day/QuickEndOfDayForm.tsx'));
console.log('Build 6.8.0 evaluation passed.');

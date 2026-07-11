import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';

function read(path) { return readFileSync(path, 'utf8'); }

const pkg = JSON.parse(read('package.json'));
assert.equal(pkg.version, '3.3.0', 'package version must be 3.3.0');
assert.ok(pkg.scripts['render-build'].includes('prisma migrate deploy'), 'render-build must use prisma migrate deploy');
assert.ok(!pkg.scripts['render-build'].includes('prisma db push'), 'render-build must not use prisma db push');
assert.ok(pkg.dependencies.zod, 'zod must be installed');
assert.ok(pkg.scripts['test:forecast'], 'forecast test script must exist');
assert.ok(pkg.scripts['test:backup'], 'backup restore drill script must exist');
assert.ok(pkg.scripts['test:tenant'], 'tenant integration test script must exist');

assert.ok(existsSync('app/signup/page.tsx'), 'self-service signup page must exist');
assert.ok(existsSync('app/api/signup/route.ts'), 'signup API route must exist');
assert.ok(existsSync('app/demo/page.tsx'), 'demo page must exist');
assert.ok(existsSync('app/api/demo/start/route.ts'), 'demo start route must exist');
assert.ok(existsSync('app/admin/restaurants/pos/page.tsx'), 'POS import page must exist');
assert.ok(existsSync('app/api/admin/tenant/export/route.ts'), 'tenant export route must exist');
assert.ok(existsSync('app/api/admin/tenant/delete/route.ts'), 'tenant delete route must exist');
assert.ok(existsSync('lib/rateLimit.ts'), 'rate limit helper must exist');
assert.ok(existsSync('lib/validators.ts'), 'zod validators must exist');
assert.ok(existsSync('lib/starterData.ts'), 'generic starter data helper must exist');
assert.ok(existsSync('scripts/forecast-engine-test.ts'), 'forecast engine tests must exist');
assert.ok(existsSync('scripts/backup-restore-drill-check.mjs'), 'backup restore drill checker must exist');
assert.ok(existsSync('prisma/migrations/20260712000100_build_330_baseline/migration.sql'), 'migration baseline must exist');

const nav = read('components/Nav.tsx');
assert.ok(nav.includes('Build 3.3.0'), 'nav badge must show Build 3.3.0');
assert.ok(nav.includes('POS Import'), 'nav must include POS import');

const login = read('app/api/login/route.ts');
assert.ok(login.includes('enforceRateLimit'), 'login must be rate limited');
assert.ok(login.includes('loginSchema'), 'login must use zod schema');

const signup = read('app/api/signup/route.ts');
assert.ok(signup.includes('signupSchema'), 'signup must use zod schema');
assert.ok(signup.includes('createDefaultRestaurantData'), 'signup must seed generic default data');
assert.ok(signup.includes('SELF_SERVICE_SIGNUP'), 'signup must audit account creation');

const setup = read('app/admin/restaurants/setup/page.tsx');
assert.ok(setup.includes('Import Sales History / POS CSV'), 'setup wizard must include sales history import');

const starter = read('lib/starterData.ts');
assert.ok(starter.includes('genericDays'), 'starter data must include generic day multipliers');
assert.ok(starter.includes('flatMonths'), 'starter data must include generic month multipliers');
assert.ok(starter.includes('createDemoHistory'), 'starter data must include demo history generator');

const tenantExport = read('app/api/admin/tenant/export/route.ts');
assert.ok(tenantExport.includes('EXPORT_TENANT_DATA'), 'tenant export must be audited');

console.log('Build 3.3.0 evaluation checks completed.');

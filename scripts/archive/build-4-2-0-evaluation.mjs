import { readFileSync, existsSync } from 'fs';

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
assert(pkg.version === '4.2.0', 'package.json version should be 4.2.0');
assert(pkg.scripts['render-build'].includes('prisma migrate deploy'), 'render-build should use prisma migrate deploy');
assert(!pkg.scripts['render-build'].includes('prisma db push'), 'render-build must not use prisma db push');
assert(!('db:push' in pkg.scripts), 'db:push script should be removed');
assert(!pkg.scripts['render-build'].includes('--accept-data-loss'), 'render-build must not use --accept-data-loss');
assert(pkg.scripts['typecheck'] === 'tsc --noEmit', 'typecheck script should run tsc --noEmit');
assert(pkg.scripts['test:forecast'].includes('forecast-engine-test'), 'forecast test script should exist');
assert(pkg.scripts['test:tenant'].includes('tenant-integration-test'), 'tenant test script should exist');
assert(pkg.scripts['test:permissions'].includes('permission-boundary-test'), 'permission boundary test script should exist');
assert(pkg.scripts['test:dead-code'].includes('dead-code-check'), 'dead-code check script should exist');
assert(pkg.scripts['ci:schema-drift'].includes('prisma migrate diff'), 'schema drift check should use prisma migrate diff');
assert(pkg.scripts['build:eval'].includes('build-4-2-0-evaluation'), 'build:eval should point to Build 4.2.0 evaluation');

const nav = readFileSync('components/Nav.tsx', 'utf8');
assert(nav.includes('Build 4.2.0'), 'Nav badge should show Build 4.2.0');

assert(existsSync('.github/workflows/ci.yml'), 'GitHub Actions CI workflow should exist');
const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
assert(ci.includes('postgres:16'), 'CI should run a Postgres service container');
assert(ci.includes('pnpm run typecheck'), 'CI should run typecheck');
assert(ci.includes('pnpm run lint'), 'CI should run lint');
assert(ci.includes('pnpm run test:forecast'), 'CI should run forecast tests');
assert(ci.includes('pnpm run test:tenant'), 'CI should run tenant integration test');
assert(ci.includes('pnpm run test:permissions'), 'CI should run permission-boundary tests');
assert(ci.includes('pnpm run ci:schema-drift'), 'CI should run Prisma schema drift check');
assert(ci.includes('prisma db push --skip-generate'), 'CI should prepare the throwaway Postgres schema before tenant tests');

const forecast = readFileSync('scripts/forecast-engine-test.ts', 'utf8');
for (const phrase of ['zero annual sales', 'all-86 proxy', 'leftover credit exceeding forecast', 'min/max settings collide', 'max cook units should cap extreme forecasts', 'extreme day/month/event multipliers']) {
  assert(forecast.includes(phrase), `forecast edge-case test should cover: ${phrase}`);
}

const permission = readFileSync('scripts/permission-boundary-test.mjs', 'utf8');
assert(permission.includes('Kitchen Crew must not be able to approve cook plans'), 'permission test should block Kitchen Crew cook-plan approval');
assert(permission.includes('Full backup export must be Admin/Owner only'), 'permission test should protect backup export');

const dead = readFileSync('scripts/dead-code-check.mjs', 'utf8');
assert(dead.includes('tenantWhere'), 'dead-code check should look for tenantWhere');
assert(dead.includes('createCookPlan'), 'dead-code check should look for disabled legacy action names');

const actions = readFileSync('app/actions.ts', 'utf8');
assert(!actions.includes('createCookPlan'), 'legacy createCookPlan server action should be deleted');
assert(!actions.includes('saveEndOfDayLog'), 'legacy saveEndOfDayLog server action should be deleted');

const backup = readFileSync('app/api/reports/backup/route.ts', 'utf8');
assert(backup.includes("build: '4.2.0'"), 'manual backup export should identify Build 4.2.0');

assert(existsSync('TEST_REPORT_BUILD_4_2_0.md'), 'Build 4.2.0 test report should exist');
assert(existsSync('CI_TESTING_BUILD_4_2_0.md'), 'Build 4.2.0 CI notes should exist');

console.log('Build 4.2.0 evaluation checks completed.');

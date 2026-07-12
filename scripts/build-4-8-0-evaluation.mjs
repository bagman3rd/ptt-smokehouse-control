#!/usr/bin/env node
import fs from 'node:fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function read(path) { return fs.readFileSync(path, 'utf8'); }

const pkg = JSON.parse(read('package.json'));
const schema = read('prisma/schema.prisma');
const guard = read('lib/tenantGuard.ts');
const ci = read('.github/workflows/ci.yml');

assert(pkg.version === '4.8.0', 'package.json version must be 4.8.0');
assert(read('components/Nav.tsx').includes('Build 4.8.0'), 'Nav badge must show Build 4.8.0');
assert(read('README.md').includes('Build 4.8.0'), 'README must reference Build 4.8.0');
assert((pkg.scripts['render-build'] || '').includes('prisma migrate deploy'), 'render-build must use migrate deploy');
assert(!(pkg.scripts['render-build'] || '').includes('prisma db push'), 'render-build must not use prisma db push');
assert(!(pkg.scripts['render-build'] || '').includes('--accept-data-loss'), 'render-build must not use --accept-data-loss');
assert((pkg.scripts['test:tenant-guard'] || '').includes('tenant-guard-coverage-test'), 'tenant guard coverage script missing');
assert((pkg.scripts['test:orphan-records'] || '').includes('orphan-record-check'), 'orphan record check script missing');
assert((pkg.scripts['test:cross-tenant'] || '').includes('cross-tenant-regression-test'), 'cross-tenant test script missing');
assert(ci.includes('pnpm run test:tenant-guard'), 'CI must run tenant guard coverage test');
assert(ci.includes('pnpm run test:orphan-records'), 'CI must run orphan record check');
assert(fs.existsSync('prisma/migrations/20260712000300_build_470_tenant_constraints/migration.sql'), 'Build 4.8.0 tenant constraints migration missing');
for (const token of ['CookPlanItem', 'EndOfDayProteinLog', 'AuditLog']) {
  assert(guard.includes(`'${token}'`), `Tenant guard must include ${token}`);
}
for (const token of [
  '@@unique([restaurantId, userId])',
  '@@unique([restaurantId, name])',
  '@@unique([restaurantId, dayOfWeek])',
  '@@unique([restaurantId, month])',
  '@@unique([restaurantId, serviceDate, scenarioId])',
  '@@unique([restaurantId, serviceDate])',
  '@@index([restaurantId, cookPlanId])',
  '@@index([restaurantId, endOfDayLogId])'
]) {
  assert(schema.includes(token), `Schema missing tenant constraint/index: ${token}`);
}
assert(fs.existsSync('TENANT_ISOLATION_BUILD_4_7_0.md'), 'security hardening docs missing');
assert(fs.existsSync('TEST_REPORT_BUILD_4_7_0.md'), 'test report missing');
assert(schema.includes('twoFactorEnabled Boolean @default(false)'), 'User.twoFactorEnabled missing');
assert(schema.includes('twoFactorSecret String?'), 'User.twoFactorSecret missing');
assert(fs.existsSync('lib/totp.ts'), 'TOTP helper missing');
assert(read('app/login/page.tsx').includes('Authenticator Code'), 'login form must include authenticator code');
assert(read('app/account/security/page.tsx').includes('Two-Factor Authentication'), 'account security page must include 2FA section');
assert(read('prisma/migrations/20260712000300_build_470_tenant_constraints/migration.sql').includes('ranked_memberships'), 'tenant constraints migration must dedupe duplicate memberships before unique index');
console.log('Build 4.8.0 evaluation checks completed.');

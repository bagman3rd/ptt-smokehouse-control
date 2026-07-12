import { readFileSync, existsSync } from 'fs';

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
assert(pkg.version === '4.3.1', 'package.json version should be 4.3.1');
assert(pkg.scripts['render-build'].includes('prisma migrate deploy'), 'render-build should use prisma migrate deploy');
assert(!pkg.scripts['render-build'].includes('prisma db push'), 'render-build must not use prisma db push');
assert(!pkg.scripts['render-build'].includes('--accept-data-loss'), 'render-build must not use --accept-data-loss');
assert(pkg.scripts['test:tenant'].includes('tenant-integration-test'), 'tenant test script should exist');
assert(pkg.scripts['test:cross-tenant'].includes('cross-tenant-regression-test'), 'cross-tenant regression test script should exist');
assert(pkg.scripts['test:account-security'].includes('account-security-test'), 'account security test script should exist');
assert(pkg.scripts['ci:schema-drift'].includes('prisma migrate diff'), 'schema drift check should use prisma migrate diff');

const nav = readFileSync('components/Nav.tsx', 'utf8');
assert(nav.includes('Build 4.3.1'), 'Nav badge should show Build 4.3.1');

const schema = readFileSync('prisma/schema.prisma', 'utf8');
for (const phrase of ['model RateLimitBucket', 'sessionVersion Int', 'failedLoginCount Int', 'lockedUntil  DateTime?', 'lastFailedLoginAt DateTime?']) {
  assert(schema.includes(phrase), `schema should include ${phrase}`);
}
assert(existsSync('prisma/migrations/20260712000200_build_430_security_tenant_guard/migration.sql'), 'Build 4.3.1 migration should exist');

const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
assert(ci.includes('postgres:16'), 'CI should run a Postgres service container');
assert(ci.includes('pnpm run test:tenant'), 'CI should run tenant isolation test');
assert(ci.includes('pnpm run test:cross-tenant'), 'CI should run cross-tenant regression test');
assert(ci.includes('pnpm run test:account-security'), 'CI should run account security tests');
assert(ci.includes('pnpm run ci:schema-drift'), 'CI should run Prisma schema drift check');

const rate = readFileSync('lib/rateLimit.ts', 'utf8');
assert(rate.includes('rateLimitBucket'), 'rate limiter should use Postgres RateLimitBucket');
assert(rate.includes('upsert'), 'rate limiter should use durable upsert');

const auth = readFileSync('lib/auth.ts', 'utf8');
assert(auth.includes('signSession(userId: string, sessionVersion: number)'), 'session signature should include sessionVersion');
assert(auth.includes('parsedSession.sessionVersion'), 'currentUser should validate sessionVersion');

const login = readFileSync('app/api/login/route.ts', 'utf8');
assert(login.includes('MAX_FAILED_LOGINS'), 'login should define account lockout threshold');
assert(login.includes('ACCOUNT_LOCKED'), 'login should audit account lockout');
assert(login.includes('failedLoginCount'), 'login should track failed logins');
assert(login.includes('lockedUntil'), 'login should enforce lockout');

const userActions = readFileSync('app/admin/users/actions.ts', 'utf8');
assert(userActions.includes('sessionVersion: { increment: 1 }'), 'password reset/deactivation should revoke active sessions');
assert(userActions.includes('RESET_PASSWORD_REVOKE_SESSIONS'), 'password reset should audit session revocation');
assert(userActions.includes('DEACTIVATE_USER_REVOKE_SESSIONS'), 'deactivation should audit session revocation');

const tenantGuard = readFileSync('lib/tenantGuard.ts', 'utf8');
assert(tenantGuard.includes('tenantGuardExtension'), 'tenant guard Prisma extension should exist');
assert(tenantGuard.includes('requires restaurantId'), 'tenant guard should throw when restaurantId is missing');

const dead = readFileSync('scripts/dead-code-check.mjs', 'utf8');
assert(dead.includes('tenantWhere'), 'dead-code check should look for tenantWhere');

const backup = readFileSync('app/api/reports/backup/route.ts', 'utf8');
assert(backup.includes("build: '4.3.1'"), 'manual backup export should identify Build 4.3.1');

assert(existsSync('TEST_REPORT_BUILD_4_3_1.md'), 'Build 4.3.1 test report should exist');
assert(existsSync('TENANT_SECURITY_BUILD_4_3_1.md'), 'Build 4.3.1 tenant/security notes should exist');

console.log('Build 4.3.1 evaluation checks completed.');

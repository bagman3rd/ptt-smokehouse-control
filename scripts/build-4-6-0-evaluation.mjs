#!/usr/bin/env node
import fs from 'node:fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function read(path) { return fs.readFileSync(path, 'utf8'); }
const pkg = JSON.parse(read('package.json'));
assert(pkg.version === '4.6.0', 'package.json version must be 4.6.0');
assert((pkg.scripts['render-build'] || '').includes('prisma migrate deploy'), 'render-build must use migrate deploy');
assert(!(pkg.scripts['render-build'] || '').includes('prisma db push'), 'render-build must not use prisma db push');
assert(!(pkg.scripts['render-build'] || '').includes('--accept-data-loss'), 'render-build must not use --accept-data-loss');
assert((pkg.scripts['build:eval'] || '').includes('build-4-6-0-evaluation'), 'build:eval must target Build 4.6.0 evaluation');
assert((pkg.scripts['staging:verify'] || '').includes('staging-verification-check'), 'staging:verify script missing');
assert(read('components/Nav.tsx').includes('Build 4.6.0'), 'Nav badge must show Build 4.6.0');
assert(read('README.md').includes('Build 4.6.0'), 'README must reference Build 4.6.0');
assert(fs.existsSync('STAGING_VERIFICATION_BUILD_4_6_0.md'), 'staging verification doc missing');
assert(fs.existsSync('DATABASE_INTEGRITY_RUNBOOK_BUILD_4_6_0.md'), 'database integrity runbook missing');
assert(fs.existsSync('TEST_REPORT_BUILD_4_6_0.md'), 'test report missing');
const system = read('app/admin/system/page.tsx');
assert(system.includes('STAGING_TENANT_TEST'), 'System page must include staging tenant test check');
assert(system.includes('STAGING_CROSS_TENANT_TEST'), 'System page must include staging cross-tenant test check');
assert(system.includes('STAGING_CLICK_TEST'), 'System page must include staging click-test check');
console.log('Build 4.6.0 evaluation checks completed.');

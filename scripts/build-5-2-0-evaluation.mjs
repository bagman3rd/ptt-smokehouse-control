#!/usr/bin/env node
import fs from 'node:fs';
function assert(condition, message) { if (!condition) throw new Error(message); }
function read(path) { return fs.readFileSync(path, 'utf8'); }
const pkg = JSON.parse(read('package.json'));
const nav = read('components/Nav.tsx');
const schema = read('prisma/schema.prisma');
const billing = read('app/billing/page.tsx');
const shell = read('components/Shell.tsx');
assert(pkg.version === '5.2.0', 'package.json version must be 5.2.0');
assert(nav.includes('Build 5.2.0'), 'Nav badge must show Build 5.2.0');
assert(read('README.md').includes('Build 5.2.0'), 'README must reference Build 5.2.0');
assert((pkg.scripts['render-build'] || '').includes('prisma migrate deploy'), 'render-build must use migrate deploy');
assert(!(pkg.scripts['render-build'] || '').includes('prisma db push'), 'render-build must not use prisma db push');
assert(!(pkg.scripts['render-build'] || '').includes('--accept-data-loss'), 'render-build must not use --accept-data-loss');
assert(schema.includes('model Subscription'), 'Subscription model missing');
assert(schema.includes('model SupportTicket'), 'SupportTicket model missing');
assert(schema.includes('model CustomerDataRequest'), 'CustomerDataRequest model missing');
assert(fs.existsSync('prisma/migrations/20260712000500_build_520_commercial_saas/migration.sql'), 'Build 5.2.0 migration missing');
assert(fs.existsSync('app/api/health/route.ts'), 'health endpoint missing');
assert(fs.existsSync('app/api/health/db/route.ts'), 'database health endpoint missing');
assert(fs.existsSync('app/support/page.tsx'), 'support page missing');
assert(fs.existsSync('app/api/support/route.ts'), 'support API missing');
assert(fs.existsSync('app/admin/data/page.tsx'), 'data export/cancellation page missing');
assert(fs.existsSync('app/api/billing/portal/route.ts'), 'billing portal route missing');
assert(billing.includes('Start {plan.toLowerCase()} checkout'), 'monthly checkout missing');
assert(billing.includes('ANNUAL'), 'annual checkout missing');
assert(shell.includes('BillingBanner'), 'billing warning banner missing from Shell');
assert(read('lib/tenantGuard.ts').includes('Subscription'), 'tenant guard must include subscription');
assert(read('lib/tenantGuard.ts').includes('SupportTicket'), 'tenant guard must include support ticket');
assert(fs.existsSync('COMMERCIAL_SAAS_BUILD_5_2_0.md'), 'commercial SaaS notes missing');
assert(fs.existsSync('TEST_REPORT_BUILD_5_2_0.md'), 'test report missing');
console.log('Build 5.2.0 evaluation checks completed.');

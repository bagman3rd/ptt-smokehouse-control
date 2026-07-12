import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
function read(p) { return fs.readFileSync(path.join(root, p), 'utf8'); }
function assert(condition, message) { if (!condition) { console.error(`FAIL: ${message}`); process.exitCode = 1; } }

const pkg = JSON.parse(read('package.json'));
assert(pkg.version === '3.1.0', 'package.json version should be 3.1.0');
const nav = read('components/Nav.tsx');
assert(nav.includes('Build 3.1.0'), 'Nav badge should show Build 3.1.0');
assert(nav.includes('/api/restaurants/switch'), 'Nav should include restaurant switcher');
assert(nav.includes('/admin/restaurants'), 'Nav should expose restaurants admin page');
assert(nav.includes('/admin/audit'), 'Nav should expose audit page');

const auth = read('lib/auth.ts');
assert(auth.includes('currentMembershipForUser'), 'Auth should resolve membership role');
assert(auth.includes('role: membership.role'), 'Membership role should become effective role');

const tenant = read('lib/tenant.ts');
assert(tenant.includes('RESTAURANT_COOKIE'), 'Tenant module should include selected restaurant cookie');
assert(tenant.includes('listRestaurantsForUser'), 'Tenant module should list restaurants for switcher');
assert(tenant.includes('membershipForUserRestaurant'), 'Tenant module should validate restaurant membership');

const schema = read('prisma/schema.prisma');
for (const model of ['Restaurant', 'RestaurantMembership', 'AuditLog']) {
  assert(schema.includes(`model ${model}`), `Schema should include ${model}`);
}
for (const field of ['restaurantId String?', 'memberships RestaurantMembership[]']) {
  assert(schema.includes(field), `Schema should include ${field}`);
}

const pages = ['app/dashboard/page.tsx','app/cook-plan/page.tsx','app/end-of-day/page.tsx','app/reports/page.tsx','app/learning/page.tsx','app/settings/page.tsx','app/admin/users/page.tsx','app/admin/restaurants/page.tsx','app/admin/audit/page.tsx'];
for (const page of pages) {
  const text = read(page);
  assert(text.includes('requireRole') || text.includes('requireAuth'), `${page} should require auth/role before data use`);
  if (!page.includes('audit')) assert(text.includes('currentRestaurantForUser') || page.includes('restaurants'), `${page} should resolve tenant context`);
}

assert(fs.existsSync(path.join(root, 'app/admin/restaurants/page.tsx')), 'Restaurant onboarding page should exist');
assert(fs.existsSync(path.join(root, 'app/admin/restaurants/setup/page.tsx')), 'Restaurant setup wizard page should exist');
assert(fs.existsSync(path.join(root, 'app/admin/audit/page.tsx')), 'Audit log page should exist');
assert(fs.existsSync(path.join(root, 'app/api/restaurants/switch/route.ts')), 'Restaurant switch route should exist');

if (process.exitCode) process.exit(process.exitCode);
console.log('Build 3.1.0 evaluation checks completed.');

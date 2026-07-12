#!/usr/bin/env node
import fs from 'fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const pkg = JSON.parse(read('package.json'));
const nav = read('components/Nav.tsx');
const schema = read('prisma/schema.prisma');
const auth = read('lib/auth.ts');
const tenant = read('lib/tenant.ts');
const setupPage = read('app/admin/restaurants/setup/page.tsx');
const setupActions = read('app/admin/restaurants/setup/actions.ts');
const loginRoute = read('app/api/login/route.ts');
const integration = read('scripts/tenant-integration-test.mjs');

assert(pkg.version === '3.2.0', 'package.json version should be 3.2.0');
assert(nav.includes('Build 3.2.0'), 'Nav badge should show Build 3.2.0');
assert(schema.includes('model RestaurantMembership'), 'RestaurantMembership model missing');
assert(schema.includes('model AuditLog'), 'AuditLog model missing');
assert(schema.includes('email        String') && !schema.includes('email        String   @unique'), 'Email should no longer be database-level unique');
assert(auth.includes('if (!membership) return null;'), 'currentUser must require membership and not fall back to User.role');
assert(!tenant.includes('role: user.role, active: true'), 'tenant helper must not create runtime membership from User.role fallback');
assert(setupPage.includes('saveRestaurantProfile') && setupPage.includes('saveSetupForecast') && setupPage.includes('saveSetupProtein') && setupPage.includes('saveSetupCurve'), 'Setup wizard should use real step forms');
assert(setupActions.includes('SETUP_PROFILE') && setupActions.includes('SETUP_FORECAST') && setupActions.includes('SETUP_PROTEIN') && setupActions.includes('SETUP_CURVE'), 'Setup actions should audit each step');
assert(loginRoute.includes('emailMatches.length === 1'), 'Login should handle non-unique email safely');
assert(integration.includes('tenant isolation integration test') && integration.includes('restaurantA.id') && integration.includes('restaurantB.id'), 'Postgres tenant integration test missing');
assert(pkg.scripts['test:tenant'], 'package.json should include test:tenant script');
assert(pkg.scripts['render-build:migrate-ready'], 'package.json should include migrate-ready render build script');
assert(read('MIGRATION_BASELINE_PLAN_BUILD_3_2_0.md').includes('Do not point production Render at `prisma migrate deploy`'), 'Migration baseline plan missing safety warning');

console.log('Build 3.2.0 evaluation checks completed.');

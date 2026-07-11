import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const pkg = JSON.parse(read('package.json'));
assert.equal(pkg.version, '3.4.1', 'package version must be 3.4.0');
assert.equal(pkg.scripts['build:eval'], 'node scripts/build-3-4-1-evaluation.mjs', 'build:eval should run Build 3.4.1 evaluation');

const nav = read('components/Nav.tsx');
assert.ok(nav.includes('Build 3.4.1'), 'nav badge must show Build 3.4.1');
assert.ok(!nav.includes('{user.name} ·'), 'nav must not display user badge text such as Admin · Admin');
assert.ok(!nav.includes('bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">{currentRestaurant.name}'), 'single-restaurant name pill must be removed from nav');

const salesModel = read('lib/salesModel.ts');
assert.ok(salesModel.includes('LIQUOR_SALES_PERCENT = 20'), 'sales model must explicitly define 20% liquor sales');
assert.ok(salesModel.includes('FOOD_SALES_PERCENT = 80'), 'sales model must explicitly define 80% food sales');
assert.ok(salesModel.includes('smokedMeatPercentOfFood'), 'sales model must show smoked meat share of food');

const dashboard = read('app/dashboard/page.tsx');
assert.ok(dashboard.includes('Sales Model: liquor is factored out'), 'dashboard must display sales-model explanation');
assert.ok(dashboard.includes('20% liquor is excluded before meat demand'), 'dashboard must make liquor exclusion obvious');
assert.ok(dashboard.includes('Liquor/Food Split'), 'dashboard must include liquor/food split stat');

const cookForm = read('app/cook-plan/CreateCookPlanForm.tsx');
assert.ok(cookForm.includes('LIQUOR_SALES_PERCENT'), 'cook-plan form must display liquor percentage');
assert.ok(cookForm.includes('salesBreakdownLine'), 'cook-plan form must display sales breakdown line');

const settings = read('app/settings/page.tsx');
assert.ok(settings.includes('Total restaurant sales include liquor'), 'settings must explain liquor is included in total sales');
assert.ok(settings.includes('PTT default 40% = 80% food × 50% smoked-meat share of food'), 'settings must explain 40% smoked-meat math');

const api = read('app/api/cook-plan/route.ts');
assert.ok(api.includes('liquor/bar ${LIQUOR_SALES_PERCENT}% excluded'), 'cook-plan notes must include liquor exclusion');

assert.ok(pkg.scripts['render-build'].includes('prisma db push'), 'render-build must use db push deploy recovery path');
assert.ok(!pkg.scripts['render-build'].includes('prisma migrate deploy'), 'render-build must not use migrate deploy until failed migration is resolved');
assert.ok(!pkg.scripts['render-build'].includes('--accept-data-loss'), 'render-build must not use accept-data-loss');
console.log('Build 3.4.1 evaluation checks completed.');

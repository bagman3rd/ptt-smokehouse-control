import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const pkg = JSON.parse(read('package.json'));
assert.equal(pkg.version, '3.5.0', 'package version must be 3.5.0');
assert.equal(pkg.scripts['build:eval'], 'node scripts/build-3-5-0-evaluation.mjs', 'build:eval should run Build 3.5.0 evaluation');
assert.ok(pkg.scripts['render-build'].includes('prisma db push'), 'active render-build must remain on db push recovery path');
assert.ok(!pkg.scripts['render-build'].includes('prisma migrate deploy'), 'active render-build must not use migrate deploy until DB baseline is repaired');
assert.ok(!pkg.scripts['render-build'].includes('--accept-data-loss'), 'render-build must not use accept-data-loss');
assert.ok(pkg.scripts['render-build:migrate-ready'].includes('prisma migrate deploy'), 'migration-ready command should remain available for staging/baseline work');

const nav = read('components/Nav.tsx');
assert.ok(nav.includes('Build 3.5.0'), 'nav badge must show Build 3.5.0');
assert.ok(!nav.includes('{user.name} ·'), 'nav must not display user badge text such as Admin · Admin');
assert.ok(!nav.includes('bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">{currentRestaurant.name}'), 'single-restaurant name pill must remain removed from nav');

const tenant = read('lib/tenant.ts');
assert.ok(!tenant.includes('tenantWhere('), 'unused tenantWhere helper should be removed');
assert.ok(!tenant.includes('tenantOrLegacyWhere('), 'unused tenantOrLegacyWhere helper should be removed');

const readme = read('README.md');
assert.ok(readme.startsWith('# Smokehouse Control — Build 3.5.0'), 'README must identify Build 3.5.0');
assert.ok(readme.includes('prisma generate && prisma db push && tsx prisma/seed.ts && next build'), 'README must match current render-build db push path');
assert.ok(readme.includes('Do not use it on the active production database until staging proves it.'), 'README must warn against premature migrate deploy');
assert.ok(readme.includes('require a live staging PostgreSQL'), 'README must distinguish existing scripts from actually-run staging tests');
assert.ok(readme.includes('in-memory rate limiter'), 'README must note in-memory rate limiter limitation');

const rateNote = read('RATE_LIMIT_AND_STAGING_NOTES_BUILD_3_5_0.md');
assert.ok(rateNote.includes('single Render web service instance'), 'rate note must define current safe scope');
assert.ok(rateNote.includes('Redis'), 'rate note must recommend a shared limiter store later');
assert.ok(rateNote.includes('live staging `DATABASE_URL`'), 'rate note must require staging DATABASE_URL for real tests');

const backupRoute = read('app/api/reports/backup/route.ts');
assert.ok(backupRoute.includes("build: '3.5.0'"), 'backup route metadata must use Build 3.5.0');
const tenantExport = read('app/api/admin/tenant/export/route.ts');
assert.ok(tenantExport.includes("build: '3.5.0'"), 'tenant export metadata must use Build 3.5.0');

const salesModel = read('lib/salesModel.ts');
assert.ok(salesModel.includes('LIQUOR_SALES_PERCENT = 20'), 'sales model must explicitly define 20% liquor sales');
assert.ok(salesModel.includes('FOOD_SALES_PERCENT = 80'), 'sales model must explicitly define 80% food sales');

console.log('Build 3.5.0 evaluation checks completed.');

import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(condition, message) {
  if (!condition) {
    console.error(`Build 5.6.0 evaluation failed: ${message}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(read('package.json'));
const forecast = read('lib/forecast.ts');
const nav = read('components/Nav.tsx');
const settings = read('app/settings/page.tsx');
const cookPlanRoute = read('app/api/cook-plan/route.ts');
const capacityRoute = read('app/api/cook-plan/capacity-preview/route.ts');

assert(pkg.version === '5.6.0', 'package version must be 5.6.0');
assert(nav.includes('Build 5.6.0'), 'nav badge must show Build 5.6.0');
assert(nav.includes('Smokehouse Control <span'), 'top nav app name must be Smokehouse Control');
assert(!nav.includes('PTT Smokehouse Control'), 'top nav must not show PTT Smokehouse Control');
assert(read('README.md').includes('Build 5.6.0'), 'README must reference Build 5.6.0');
assert(forecast.includes('scenario mix percentages are cooked-weight mix'), 'forecast must document cooked-weight mix behavior');
assert(forecast.includes('totalCookedLbFromBbqSales'), 'forecast must convert BBQ sales to total cooked pounds');
assert(forecast.includes('weightedRevenuePerCookedLb'), 'forecast must use weighted average revenue per cooked pound');
assert(!forecast.includes('const proteinSalesDollars = args.forecastBbqSales * mixPct'), 'forecast must not split BBQ dollars by protein mix');
assert(cookPlanRoute.includes('proteins, scenario'), 'cook plan route must pass all active proteins to forecast engine');
assert(capacityRoute.includes('proteins, scenario'), 'capacity preview must pass all active proteins to forecast engine');
assert(settings.includes('Protein mix percentages are cooked-weight mix, not dollar mix'), 'settings must explain cooked-weight mix');
assert(settings.includes('Brisket Mix % of cooked meat weight'), 'settings labels must clarify cooked-weight mix');
assert(read('app/layout.tsx').includes("title: 'Smokehouse Control'"), 'metadata title must remove PTT');
assert(read('package.json').includes('prisma migrate deploy'), 'render build must use migrate deploy');
assert(!read('package.json').includes('prisma db push'), 'render build must not use db push');
assert(!read('package.json').includes('--accept-data-loss'), 'build must not use accept-data-loss');
console.log('Build 5.6.0 evaluation checks completed.');

import fs from 'node:fs';
function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(condition, message) { if (!condition) throw new Error(message); }
const pkg = JSON.parse(read('package.json'));
assert(pkg.version === '5.8.1', 'package version must be 5.8.1');
assert(read('components/Nav.tsx').includes('Build 5.8.1'), 'nav must show Build 5.8.1');
assert(read('components/Nav.tsx').includes('Operations') && read('components/Nav.tsx').includes('Insights') && read('components/Nav.tsx').includes('Admin'), 'nav dropdown groups missing');
assert(read('app/admin/smokers/catalog/page.tsx').includes('officialCapacityText'), 'catalog page must show official capacity text');
assert(!read('app/admin/smokers/catalog/page.tsx').includes('item.notes'), 'catalog page must not show verbose notes');
assert(read('components/smokers/SmokerCatalogForms.tsx').includes('Pound capacities and whole-chicken capacities are displayed above, not converted'), 'smoker form must explain no conversions');
assert(read('components/smokers/SmokerCatalogForms.tsx').includes('preferredNumberInput'), 'smoker form must coerce nullable numeric defaults before rendering inputs');
assert(read('prisma/schema.prisma').includes('officialCapacityText'), 'schema must include officialCapacityText');
assert(read('package.json').includes('test:generate-plan'), 'generate plan regression script must be registered');
const appText = ['app/learning/page.tsx','app/admin/restaurants/page.tsx','app/admin/system/page.tsx','app/help/page.tsx','app/billing/page.tsx','app/admin/smokers/page.tsx','app/admin/smokers/schedule/page.tsx','app/admin/smokers/catalog/page.tsx'].map(read).join('\n');
assert(!/Build 4\.|Build 5\.[0-7]/.test(appText), 'user-facing app pages still contain old build-note copy');
assert(!read('package.json').includes('--accept-data-loss'), 'package must not include --accept-data-loss');
assert(pkg.scripts['render-build'].includes('prisma migrate deploy'), 'render-build must use migrate deploy');
console.log('Build 5.8.1 evaluation checks completed.');

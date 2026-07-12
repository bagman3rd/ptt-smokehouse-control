import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const pkg = JSON.parse(read('package.json'));
assert(pkg.version === '5.9.3', 'package version must be 5.9.3');
assert(read('components/Nav.tsx').includes('Build 5.9.3'), 'nav must show Build 5.9.3');
assert(read('components/Nav.tsx').includes('NavMenu'), 'nav must use client-side NavMenu');
const smokerForm = read('components/smokers/SmokerCatalogForms.tsx');
for (const label of ['Smoker Brand', 'Catalog model', 'Catalog brand', 'Model', 'Location', 'Cook window', 'Rack count', 'Briskets per cook', 'Pork butts per cook', 'Rib racks per cook', 'Chicken / double breasts per cook']) {
  assert(smokerForm.includes(label), `Smoker form missing visible label: ${label}`);
}
for (const option of ['Outdoor', 'Indoors under hood', 'In the wall', 'Outdoors in smoke house']) {
  assert(smokerForm.includes(option), `location dropdown missing option: ${option}`);
}
for (const option of ['Overnight only', 'Same-day only', 'All day / flexible', 'Backup / overflow only', 'Not currently active']) {
  assert(smokerForm.includes(option), `cook window dropdown missing option: ${option}`);
}
const catalog = read('lib/smokerCatalogData.ts');
assert(catalog.includes("model:'SPK-500'"), 'SPK-500 catalog row must exist');
assert(catalog.includes('chickenCapacity:70'), 'SPK-500 must load 70 chicken / double-breast units');
assert(catalog.includes('chickenCapacity:32'), 'MLR-150 must load 32 chicken / double-breast units');
assert(catalog.includes('chickenCapacity:72'), 'EL-ED/X must load 72 chicken / double-breast units');
assert(read('app/admin/smokers/page.tsx').includes('Whole-chicken counts load 1:1'), 'Smoker page must explain chicken count rule');
assert(read('app/admin/smokers/catalog/page.tsx').includes('Whole chickens load 1:1'), 'Catalog page must explain chicken count rule');
assert(read('README.md').includes('Build 5.9.3'), 'README must reference Build 5.9.3');
console.log('Build 5.9.3 evaluation checks completed.');

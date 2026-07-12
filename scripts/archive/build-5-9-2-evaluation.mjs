import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const pkg = JSON.parse(read('package.json'));
assert(pkg.version === '5.9.2', 'package version must be 5.9.2');
assert(read('components/Nav.tsx').includes('Build 5.9.2'), 'nav must show Build 5.9.2');
assert(read('components/Nav.tsx').includes('NavMenu'), 'nav must use client-side NavMenu');
const navMenu = read('components/NavMenu.tsx');
assert(navMenu.includes("'use client'"), 'NavMenu must be a client component');
assert(navMenu.includes('openGroup'), 'NavMenu must track one open dropdown');
assert(navMenu.includes('document.addEventListener'), 'NavMenu must close on outside document events');
assert(navMenu.includes("event.key === 'Escape'"), 'NavMenu must close on Escape');
assert(!read('components/Nav.tsx').includes('<details'), 'server Nav must not use native details dropdowns');
const smokerForm = read('components/smokers/SmokerCatalogForms.tsx');
for (const label of ['Smoker name', 'Catalog model', 'Brand', 'Model', 'Location', 'Cook window', 'Rack count', 'Briskets per cook', 'Pork butts per cook', 'Rib racks per cook', 'Chicken breasts per cook']) {
  assert(smokerForm.includes(label), `Add Smoker form missing visible label: ${label}`);
}
assert(read('README.md').includes('Build 5.9.2'), 'README must reference Build 5.9.2');
console.log('Build 5.9.2 evaluation checks completed.');

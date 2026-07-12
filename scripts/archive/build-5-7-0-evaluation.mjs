import fs from 'node:fs';
function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(condition, message) {
  if (!condition) {
    console.error(`Build 5.7.0 evaluation failed: ${message}`);
    process.exit(1);
  }
}
const pkg = JSON.parse(read('package.json'));
const nav = read('components/Nav.tsx');
const schema = read('prisma/schema.prisma');
const catalog = read('lib/smokerCatalogData.ts');
const forms = read('components/smokers/SmokerCatalogForms.tsx');
const smokersPage = read('app/admin/smokers/page.tsx');
const migration = read('prisma/migrations/20260712000600_build_570_official_smoker_catalog/migration.sql');
assert(pkg.version === '5.7.0', 'package version must be 5.7.0');
assert(nav.includes('Build 5.7.0'), 'nav badge must show Build 5.7.0');
assert(read('README.md').includes('Build 5.7.0'), 'README must reference Build 5.7.0');
assert(schema.includes('brisketCapacity Float?'), 'SmokerCatalog brisket capacity must be nullable');
assert(schema.includes('porkCapacity    Float?'), 'SmokerCatalog pork capacity must be nullable');
assert(migration.includes('DROP NOT NULL'), 'migration must make catalog capacity fields nullable');
assert(catalog.includes("model:'MLR-150'") && catalog.includes('porkCapacity:24') && catalog.includes('ribCapacity:24') && catalog.includes('brisketCapacity:8'), 'MLR-150 official capacities must be corrected');
assert(catalog.includes("sourceConfidence:'OFFICIAL_PARTIAL'"), 'catalog must support official partial rows');
assert(!catalog.includes("sourceConfidence:'ESTIMATED'"), 'catalog must not include ESTIMATED rows');
assert(!catalog.includes('capacities estimated'), 'catalog must not say capacities estimated');
assert(catalog.includes('Retired by Build 5.7.0'), 'seed must retire old unverified catalog rows');
assert(forms.includes('official data not published'), 'forms must show missing official data clearly');
assert(smokersPage.includes('manufacturer-verified smoker catalog only'), 'smokers page must explain manufacturer-only catalog');
assert(read('package.json').includes('prisma migrate deploy'), 'render build must use migrate deploy');
assert(!read('package.json').includes('prisma db push'), 'render build must not use db push');
assert(!read('package.json').includes('--accept-data-loss'), 'build must not use accept-data-loss');
console.log('Build 5.7.0 evaluation checks completed.');

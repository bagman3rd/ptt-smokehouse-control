import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(condition, message) {
  if (!condition) {
    console.error(`Build 5.5.0 evaluation failed: ${message}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(read('package.json'));
assert(pkg.version === '5.5.0', 'package version must be 5.5.0');
assert(read('components/Nav.tsx').includes('Build 5.5.0'), 'nav badge must show Build 5.5.0');
assert(read('README.md').includes('Build 5.5.0'), 'README must reference Build 5.5.0');
assert(read('prisma/schema.prisma').includes('model SmokerCatalog'), 'Prisma schema must include SmokerCatalog');
assert(read('prisma/schema.prisma').includes('catalogId'), 'Smoker must include catalogId');
assert(fs.existsSync('prisma/migrations/20260712000500_build_550_smoker_catalog/migration.sql'), 'smoker catalog migration must exist');
assert(read('lib/smokerCatalogData.ts').includes('ensureSmokerCatalog'), 'smoker catalog seed helper must exist');
assert(read('app/admin/smokers/page.tsx').includes('AddSmokerForm'), 'smoker page must use catalog add form');
assert(fs.existsSync('app/admin/smokers/catalog/page.tsx'), 'catalog page must exist');
assert(read('package.json').includes('prisma migrate deploy'), 'render build must use migrate deploy');
assert(!read('package.json').includes('prisma db push'), 'render build must not use db push');
assert(!read('package.json').includes('--accept-data-loss'), 'build must not use accept-data-loss');
console.log('Build 5.5.0 evaluation checks completed.');

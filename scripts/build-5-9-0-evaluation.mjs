import fs from 'node:fs';
function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(condition, message) { if (!condition) throw new Error(message); }
const pkg = JSON.parse(read('package.json'));
assert(pkg.version === '5.9.0', 'package version must be 5.9.0');
assert(read('components/Nav.tsx').includes('Build 5.9.0'), 'nav must show Build 5.9.0');
assert(read('README.md').includes('Build 5.9.0'), 'README must reference Build 5.9.0');
assert(read('prisma/migrations/20260712000100_build_330_baseline/migration.sql').includes('CREATE TABLE "Restaurant"'), 'baseline must create Restaurant');
assert(read('prisma/migrations/20260712000100_build_330_baseline/migration.sql').includes('CREATE TABLE "PosImportRow"'), 'baseline must include latest POS table');
assert(!read('prisma/migrations/20260712000100_build_330_baseline/migration.sql').includes('Build 3.3.0 migration baseline'), 'old empty baseline text must be gone');
assert(!read('.github/workflows/ci.yml').includes('prisma db push'), 'CI must not use db push');
assert(read('.github/workflows/ci.yml').includes('pnpm run prisma:migrate'), 'CI must use migrate deploy');
assert(pkg.scripts['render-build'] === 'prisma generate && prisma migrate deploy && tsx prisma/seed.ts && next build', 'render-build must be plain migrate deploy path');
assert(pkg.scripts['test:migration-integrity'] === 'node scripts/migration-integrity-test.mjs', 'migration integrity test must be registered');
console.log('Build 5.9.0 evaluation checks completed.');

import { readFileSync, existsSync, readdirSync } from 'node:fs';

function read(path) { return readFileSync(path, 'utf8'); }
function assert(condition, message) {
  if (!condition) {
    console.error(`Preflight failed: ${message}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(read('package.json'));
const version = pkg.version;
const buildLabel = `Build ${version}`;

assert(version === '6.3.1', 'package.json version must be 6.3.1 for this build');
assert(read('README.md').includes(buildLabel), 'README must mention the current build label');
assert(read('components/Nav.tsx').includes(buildLabel), 'Nav badge must show the current build label');
assert(pkg.scripts.typecheck === 'tsc --noEmit', 'typecheck script must run tsc --noEmit');
assert(pkg.scripts.lint === 'next lint', 'lint script must run next lint');
assert(pkg.scripts.build === 'next build', 'build script must run next build');
assert(pkg.scripts['render-build']?.includes('prisma migrate deploy'), 'render-build must use prisma migrate deploy');
assert(!pkg.scripts['render-build']?.includes('db push'), 'render-build must not use prisma db push');
assert(!read('package.json').includes('--accept-data-loss'), 'package scripts must not use --accept-data-loss');
assert(existsSync('prisma/migrations'), 'prisma/migrations folder must exist');
assert(readdirSync('prisma/migrations').some((name) => name.includes('build_330_baseline')), 'baseline migration must exist');
assert(existsSync('.github/workflows/ci.yml'), 'GitHub Actions CI workflow must exist');
assert(read('.github/workflows/ci.yml').includes('pnpm run preflight'), 'CI must run preflight before typecheck/lint/tests');

assert(existsSync('pnpm-lock.yaml') || existsSync('.github/workflows/lockfile-bootstrap.yml'), 'pnpm-lock.yaml or the one-time lockfile bootstrap workflow must exist');
assert(read('.github/workflows/ci.yml').includes('pnpm install --frozen-lockfile'), 'CI must enforce the committed lockfile');
assert(read('render.yaml').includes('--frozen-lockfile'), 'Render must enforce the committed lockfile');
assert(read('lib/smokerSchedule.ts').includes('!smoker.configurationReviewedAt'), 'unreviewed smokers must be excluded from scheduling');
assert(existsSync('scripts/production-smoke-check.mjs'), 'production monitoring smoke check must exist');
assert(existsSync('scripts/migration-smoke-check.mjs'), 'migration smoke check must exist');
assert(existsSync('docs/archive'), 'historical release artifacts must be archived');



const baseline = read('prisma/migrations/20260712000100_build_330_baseline/migration.sql');
assert(baseline.includes('CREATE TABLE "Restaurant"'), 'baseline migration must create Restaurant on a fresh database');
assert(baseline.includes('CREATE TABLE "PosImportRow"'), 'baseline migration must include latest tables');
assert(!baseline.includes('intentionally contains no destructive DDL'), 'empty placeholder baseline must not return');
assert(pkg.scripts['test:migration-integrity'] === 'node scripts/migration-integrity-test.mjs', 'migration integrity test must be registered');
assert(!read('.github/workflows/ci.yml').includes('prisma db push'), 'CI must not use prisma db push');
assert(read('.github/workflows/ci.yml').includes('pnpm run prisma:migrate'), 'CI must use prisma migrate deploy against fresh Postgres');

const projectText = ['README.md', 'package.json', 'components/Nav.tsx', '.github/workflows/ci.yml'].map((file) => read(file)).join('\n');
for (const token of ['Build 4.4.0', 'build-4-4-0-evaluation', 'prisma db push &&', 'db push --accept-data-loss']) {
  assert(!projectText.includes(token), `obsolete token still present: ${token}`);
}
assert(!read('lib/tenantGuard.ts').includes('tenantOrLegacyWhere'), 'retired tenantOrLegacyWhere helper must not return');
assert(!read('lib/tenantGuard.ts').includes('tenantWhere('), 'retired tenantWhere helper must not return');

console.log('Build 6.3.1 preflight checks completed.');

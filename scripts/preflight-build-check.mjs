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

assert(version === '5.3.0', 'package.json version must be 5.3.0 for this build');
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

const projectText = ['README.md', 'package.json', 'components/Nav.tsx', '.github/workflows/ci.yml'].map((file) => read(file)).join('\n');
for (const token of ['Build 4.4.0', 'build-4-4-0-evaluation', 'prisma db push &&', 'db push --accept-data-loss']) {
  assert(!projectText.includes(token), `obsolete token still present: ${token}`);
}
assert(!read('lib/tenantGuard.ts').includes('tenantOrLegacyWhere'), 'retired tenantOrLegacyWhere helper must not return');
assert(!read('lib/tenantGuard.ts').includes('tenantWhere('), 'retired tenantWhere helper must not return');

console.log('Build 5.3.0 preflight checks completed.');

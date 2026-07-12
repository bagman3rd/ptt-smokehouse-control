import { readFileSync, existsSync } from 'node:fs';

function read(path) { return readFileSync(path, 'utf8'); }
function assert(condition, message) { if (!condition) { console.error(message); process.exit(1); } }

const pkg = JSON.parse(read('package.json'));
assert(pkg.version === '4.5.0', 'package version must be 4.5.0');
assert(read('components/Nav.tsx').includes('Build 4.5.0'), 'nav badge must show Build 4.5.0');
assert(read('README.md').includes('Build 4.5.0'), 'README must mention Build 4.5.0');
assert(pkg.scripts.preflight === 'node scripts/preflight-build-check.mjs', 'preflight script must exist in package.json');
assert(existsSync('scripts/preflight-build-check.mjs'), 'preflight script file must exist');
assert(read('.github/workflows/ci.yml').includes('pnpm run preflight'), 'CI must run preflight');
assert(pkg.scripts.typecheck === 'tsc --noEmit', 'typecheck must be tsc --noEmit');
assert(pkg.scripts.lint === 'next lint', 'lint script must be present');
assert(pkg.scripts['render-build'].includes('prisma migrate deploy'), 'render-build must use migrate deploy');
assert(!pkg.scripts['render-build'].includes('db push'), 'render-build must not use db push');
assert(!read('package.json').includes('--accept-data-loss'), 'package.json must not include --accept-data-loss');
console.log('Build 4.5.0 evaluation checks completed.');

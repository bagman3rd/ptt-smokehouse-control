import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const pkg = JSON.parse(read('package.json'));
const bootstrap = read('.github/workflows/lockfile-bootstrap.yml');
const ci = read('.github/workflows/ci.yml');

assert.equal(pkg.version, '6.3.4');
assert(bootstrap.includes('name: Build 6.3.4 Lockfile Bootstrap'));
assert(!bootstrap.includes("if: ${{ hashFiles('pnpm-lock.yaml') == '' }}"));
assert(bootstrap.includes('Check whether lockfile already exists'));
assert(bootstrap.includes("if: steps.lockfile.outputs.missing == 'true'"));
assert(bootstrap.includes('No lockfile change was produced; nothing to commit.'));
assert(!ci.includes('workflow_run:'));
assert(ci.includes('name: Build 6.3.4 CI'));
assert(read('components/Nav.tsx').includes('Build 6.3.4'));
assert(read('app/api/health/route.ts').includes("build: '6.3.4'"));
console.log('Build 6.3.4 evaluation completed.');

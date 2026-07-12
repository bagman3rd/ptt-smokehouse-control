import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const workflow = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
const nav = fs.readFileSync('components/Nav.tsx', 'utf8');

const checks = [
  ['package version', pkg.version === '6.2.1'],
  ['visible build label', nav.includes('Build 6.2.1')],
  ['workflow version', workflow.includes('name: Build 6.2.1 CI')],
  ['pnpm cache disabled without lockfile', !workflow.includes('cache: pnpm')],
  ['toolchain verification exists', workflow.includes('Verify toolchain')],
  ['diagnostic CI stages are separated', workflow.includes('TypeScript and lint') && workflow.includes('Security and tenant regression tests')],
  ['Playwright artifact tolerates missing report', workflow.includes('if-no-files-found: ignore')],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  failed ||= !ok;
}
if (failed) process.exit(1);
console.log('Build 6.2.1 evaluation completed.');

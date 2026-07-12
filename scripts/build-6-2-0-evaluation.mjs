import fs from 'node:fs';
const checks = [
  ['version', JSON.parse(fs.readFileSync('package.json','utf8')).version === '6.2.0'],
  ['production Playwright server', fs.readFileSync('playwright.config.ts','utf8').includes("command: 'pnpm run start'")],
  ['mobile CI included', !fs.readFileSync('.github/workflows/ci.yml','utf8').includes('--project=chromium')],
  ['single pnpm package manager', fs.readFileSync('.github/workflows/ci.yml','utf8').includes('pnpm install') && fs.readFileSync('render.yaml','utf8').includes('pnpm install')],
  ['no automatic migration history rewrite', !JSON.parse(fs.readFileSync('package.json','utf8')).scripts['render-build'].includes('reconcile-migration-history')],
  ['complete workflow test', fs.readFileSync('e2e/core-workflow.spec.ts','utf8').includes('complete kitchen workflow')],
  ['safer catalog migration', fs.readFileSync('prisma/migrations/20260712000800_build_620_release_reliability/migration.sql','utf8').includes('SET "cookWindow" = NULL')]
];
const failed = checks.filter(([,ok])=>!ok);
for (const [name,ok] of checks) console.log(`${ok?'PASS':'FAIL'} ${name}`);
if (failed.length) process.exit(1);

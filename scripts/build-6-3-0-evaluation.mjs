import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const pkg = JSON.parse(read('package.json'));
const checks = [
  ['package version', pkg.version === '6.3.0'],
  ['visible version', read('components/Nav.tsx').includes('Build 6.3.0')],
  ['review required by scheduler', read('lib/smokerSchedule.ts').includes('!smoker.configurationReviewedAt')],
  ['legacy smokers disabled migration', read('prisma/migrations/20260712000900_build_630_reliability_completion/migration.sql').includes('"active" = false')],
  ['core tenant keys non-null in schema', ['Protein','CookPlan','CookPlanItem','EndOfDayLog','EndOfDayProteinLog','Smoker','AuditLog'].every((model) => { const schema = read('prisma/schema.prisma'); const start = schema.indexOf(`model ${model} {`); const end = schema.indexOf('\nmodel ', start + 1); return !schema.slice(start, end < 0 ? undefined : end).includes('restaurantId String?') && !schema.slice(start, end < 0 ? undefined : end).includes('restaurantId        String?') && !schema.slice(start, end < 0 ? undefined : end).includes('restaurantId    String?') && !schema.slice(start, end < 0 ? undefined : end).includes('restaurantId          String?') && !schema.slice(start, end < 0 ? undefined : end).includes('restaurantId   String?'); })],
  ['authenticated cross-tenant test', read('e2e/core-workflow.spec.ts').includes('authenticated user cannot read another restaurant')],
  ['stable test ids', read('e2e/core-workflow.spec.ts').includes("getByTestId('protein-card-BRISKET')")],
  ['archive created', fs.existsSync('docs/archive') && fs.existsSync('scripts/archive')],
  ['production smoke monitor', fs.existsSync('.github/workflows/production-monitor.yml') && fs.existsSync('scripts/production-smoke-check.mjs')],
  ['migration smoke check', pkg.scripts['migration:smoke'] === 'node scripts/migration-smoke-check.mjs'],
  ['lockfile bootstrap', fs.existsSync('.github/workflows/lockfile-bootstrap.yml')],
];
let failed = false;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`); failed ||= !ok; }
if (failed) process.exit(1);
console.log('Build 6.3.0 evaluation completed.');

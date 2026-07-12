import { readFileSync, readdirSync } from 'node:fs';

function read(path) { return readFileSync(path, 'utf8'); }
function assert(condition, message) {
  if (!condition) {
    console.error(`Migration integrity failed: ${message}`);
    process.exit(1);
  }
}

const baselinePath = 'prisma/migrations/20260712000100_build_330_baseline/migration.sql';
const baseline = read(baselinePath);
const requiredTables = [
  'Restaurant', 'User', 'RestaurantMembership', 'Protein', 'ForecastScenario', 'CookPlan', 'CookPlanItem',
  'EndOfDayLog', 'EndOfDayProteinLog', 'Smoker', 'SmokerCatalog', 'LearningRecommendation', 'SystemCheck',
  'RateLimitBucket', 'Subscription', 'SupportTicket', 'CustomerDataRequest', 'MenuItemMapping', 'PosImportBatch', 'PosImportRow'
];

assert(baseline.length > 20000, 'baseline migration is too small to be a full-schema baseline');
assert(!baseline.includes('intentionally contains no destructive DDL'), 'placeholder baseline text is still present');
assert(!baseline.includes('zero CREATE TABLE'), 'placeholder/failure language must not be present');
for (const table of requiredTables) {
  assert(baseline.includes(`CREATE TABLE "${table}"`), `baseline missing CREATE TABLE for ${table}`);
}
for (const type of ['Role', 'ScenarioType', 'ProteinUnit']) {
  assert(baseline.includes(`CREATE TYPE "${type}"`), `baseline missing enum type ${type}`);
}
assert(baseline.includes('ALTER TABLE "CookPlanItem" ADD CONSTRAINT "CookPlanItem_cookPlanId_fkey"'), 'baseline missing core CookPlanItem foreign key');
assert(baseline.includes('CREATE UNIQUE INDEX "RestaurantMembership_restaurantId_userId_key"'), 'baseline missing tenant membership uniqueness');

const workflow = read('.github/workflows/ci.yml');
assert(!workflow.includes('prisma db push'), 'CI workflow must not use prisma db push');
assert(workflow.includes('prisma migrate deploy') || workflow.includes('pnpm run prisma:migrate'), 'CI workflow must apply migrations with migrate deploy');
assert(workflow.includes('pnpm run ci:migration-status'), 'CI must check migration status after migrate deploy');
assert(workflow.includes('pnpm run ci:schema-drift'), 'CI must run schema drift check after migrations');

const pkg = JSON.parse(read('package.json'));
assert(!pkg.scripts['render-build'].includes('migrate resolve'), 'render-build must not hide migration errors with migrate resolve');
assert(pkg.scripts['render-build'].includes('prisma migrate deploy'), 'render-build must run prisma migrate deploy');
assert(!JSON.stringify(pkg.scripts).includes('prisma db push'), 'package scripts must not use prisma db push');

const migrations = readdirSync('prisma/migrations').filter((name) => /^\d{14}_/.test(name)).sort();
const prefixes = new Map();
for (const name of migrations) {
  const prefix = name.slice(0, 14);
  prefixes.set(prefix, [...(prefixes.get(prefix) || []), name]);
}
const duplicated = [...prefixes.entries()].filter(([, names]) => names.length > 1);
const historyDoc = read('docs/archive/MIGRATION_HISTORY_LOCK_BUILD_5_9_0.md');
for (const [prefix, names] of duplicated) {
  assert(historyDoc.includes(prefix), `duplicate timestamp prefix ${prefix} must be explicitly documented if preserved for production history`);
  for (const name of names) assert(historyDoc.includes(name), `migration history lock missing ${name}`);
}


for (const name of migrations.filter((migrationName) => migrationName !== '20260712000100_build_330_baseline')) {
  const sql = read(`prisma/migrations/${name}/migration.sql`);
  const hasConstraint = /ALTER TABLE\s+"[^"]+"\s+ADD CONSTRAINT/.test(sql);
  const guardedConstraint = sql.includes('EXCEPTION WHEN duplicate_object') || sql.includes('information_schema.table_constraints');
  assert(!hasConstraint || guardedConstraint, `${name} has an unguarded ADD CONSTRAINT statement that can fail on a fresh full-baseline rebuild`);
}

console.log('Build 6.3.4 migration integrity checks completed.');


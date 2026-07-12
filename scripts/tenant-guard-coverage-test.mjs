#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

function read(path) { return fs.readFileSync(path, 'utf8'); }
const guard = read('lib/tenantGuard.ts');
const schema = read('prisma/schema.prisma');

const requiredModels = [
  'AuditLog',
  'Protein',
  'SavedReport',
  'ReportRun',
  'ForecastScenario',
  'DayMultiplier',
  'MonthMultiplier',
  'EventModifier',
  'CookPlan',
  'CookPlanItem',
  'EndOfDayLog',
  'EndOfDayProteinLog',
  'Smoker',
  'LearningRecommendation',
  'SystemCheck'
];

for (const model of requiredModels) {
  assert(guard.includes(`'${model}'`), `Tenant guard is missing ${model}`);
}

for (const model of ['CookPlanItem', 'EndOfDayProteinLog']) {
  const start = schema.indexOf(`model ${model}`);
  assert(start >= 0, `${model} schema model missing`);
  const end = schema.indexOf('\n}', start);
  const block = schema.slice(start, end);
  assert(block.includes('restaurantId'), `${model} must carry restaurantId for direct tenant enforcement`);
  assert(block.includes('@@index([restaurantId'), `${model} must have restaurantId index`);
}

assert(guard.includes('DISABLE_TENANT_GUARD'), 'Tenant guard must have explicit maintenance escape hatch');
assert(guard.includes("process.env.NODE_ENV !== 'production'"), 'Tenant guard should fail loudly in dev/CI without blocking production maintenance');
console.log('Build 4.7.0 tenant guard coverage checks completed.');

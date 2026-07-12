import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
}

const pkg = JSON.parse(read('package.json'));
const nav = read('components/Nav.tsx');
const schema = read('prisma/schema.prisma');
const system = read('app/admin/system/page.tsx');
const smokers = read('app/admin/smokers/page.tsx');
const smokerActions = read('app/admin/smokers/actions.ts');
const learning = read('app/learning/page.tsx');
const learningActions = read('app/learning/actions.ts');
const dashboard = read('app/dashboard/page.tsx');
const appActions = read('app/actions.ts');
const readme = read('README.md');

assert(pkg.version === '3.6.0', 'package version is 3.6.0');
assert(nav.includes('Build 3.6.0'), 'nav badge is Build 3.6.0');
assert(nav.includes("'/admin/system'") && nav.includes("'/admin/smokers'"), 'nav includes System and Smokers pages');
assert(schema.includes('model Smoker') && schema.includes('model LearningRecommendation'), 'schema includes Smoker and LearningRecommendation models');
assert(system.includes('System Health') && system.includes('DB Push Recovery Mode'), 'system health page exists and shows recovery mode');
assert(system.includes('test:tenant') && system.includes('test:backup'), 'system health page surfaces staging test commands');
assert(smokers.includes('Smoker Capacity') && smokerActions.includes('createSmoker') && smokerActions.includes('updateSmoker'), 'smoker capacity page and actions exist');
assert(learning.includes('Recommendation Approval Queue'), 'learning approval queue is visible');
assert(learningActions.includes('saveLearningRecommendation') && learningActions.includes('decideLearningRecommendation'), 'learning recommendation actions exist');
assert(dashboard.includes('smokerCapacity') && dashboard.includes('exceeds active smoker capacity'), 'dashboard checks smoker capacity');
assert(appActions.includes("entity: 'Protein'") && appActions.includes("entity: 'ForecastScenario'"), 'settings changes are audit logged');
assert(pkg.scripts['render-build'].includes('prisma db push'), 'render build remains on db-push recovery path');
assert(!pkg.scripts['render-build'].includes('--accept-data-loss'), 'render build does not use accept-data-loss');
assert(readme.includes('Build 3.6.0'), 'README references Build 3.6.0');
console.log('Build 3.6.0 evaluation checks completed.');

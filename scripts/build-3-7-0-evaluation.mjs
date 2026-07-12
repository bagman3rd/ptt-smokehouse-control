import fs from 'fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(condition, message) { if (!condition) { console.error(`FAIL: ${message}`); process.exit(1); } }

const pkg = JSON.parse(read('package.json'));
const nav = read('components/Nav.tsx');
const schema = read('prisma/schema.prisma');
const learningPage = read('app/learning/page.tsx');
const learningActions = read('app/learning/actions.ts');
const form = read('app/cook-plan/CreateCookPlanForm.tsx');
const previewRoute = read('app/api/cook-plan/capacity-preview/route.ts');
const actions = read('app/actions.ts');

assert(pkg.version === '3.7.0', 'package.json version should be 3.7.0');
assert(nav.includes('Build 3.7.0'), 'nav badge should show Build 3.7.0');
assert(schema.includes('confidence   String'), 'LearningRecommendation should store confidence');
assert(schema.includes('sampleCount  Int'), 'LearningRecommendation should store sample count');
assert(schema.includes('rolledBackAt DateTime?'), 'LearningRecommendation should support rollback');
assert(learningActions.includes('applyRecommendation'), 'accepted recommendations should apply settings');
assert(learningActions.includes('rollbackLearningRecommendation'), 'rollback action should exist');
assert(learningActions.includes('APPLY_RECOMMENDATION'), 'apply audit log should exist');
assert(learningActions.includes('ROLLBACK_RECOMMENDATION'), 'rollback audit log should exist');
assert(learningPage.includes('Forecast Accuracy Report'), 'forecast accuracy report should exist');
assert(learningPage.includes('minimumSampleCount'), 'minimum sample-size rules should be saved');
assert(learningPage.includes('Confirm Apply'), 'before/after confirmation should be explicit');
assert(learningPage.includes('Before/after setting preview'), 'before/after preview should be visible');
assert(learningPage.includes('Rollback Change'), 'rollback UI should exist');
assert(form.includes('/api/cook-plan/capacity-preview'), 'cook plan form should check smoker capacity before generation');
assert(form.includes('Smoker capacity preview before Generate Plan'), 'capacity preview UI should be visible before generation');
assert(previewRoute.includes('projectedUnits'), 'capacity preview route should return projected units');
assert(previewRoute.includes('overCapacity'), 'capacity preview route should detect over-capacity loads');
assert(actions.includes('beforeJson: before') && actions.includes('afterJson: data'), 'settings actions should audit before/after values');

console.log('Build 3.7.0 evaluation checks completed.');

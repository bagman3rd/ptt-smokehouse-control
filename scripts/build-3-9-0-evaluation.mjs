import fs from 'fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const pkg = JSON.parse(read('package.json'));
assert(pkg.version === '3.9.0', 'package version must be 3.9.0');
assert(pkg.scripts['build:eval'] === 'node scripts/build-3-9-0-evaluation.mjs', 'build:eval should point to 3.9.0 script');

const nav = read('components/Nav.tsx');
assert(nav.includes('Build 3.9.0'), 'nav badge must show Build 3.9.0');
assert(nav.includes("['Today', '/today'"), 'Today nav link is required');

assert(fs.existsSync('app/today/page.tsx'), '/today page must exist');
const today = read('app/today/page.tsx');
assert(today.includes('daily command center'), 'today page should identify daily command center');
assert(today.includes('Smoker Load Schedule'), 'today page should show smoker load schedule');
assert(today.includes('Data Quality'), 'today page should show data quality');

const dq = read('lib/dataQuality.ts');
assert(dq.includes('computeDataQuality'), 'data quality helper missing');
assert(dq.includes('Backup/restore discipline recorded'), 'backup/restore check missing from data quality');

const eod = read('app/end-of-day/EndOfDayForm.tsx');
assert(eod.includes('Guided Closeout Workflow'), 'guided EOD closeout missing');
assert(eod.includes('Leftovers physically counted'), 'EOD closeout checklist missing');

const actions = read('app/actions.ts');
assert(actions.includes('Manual cook-plan overrides require a manager reason'), 'override reason enforcement missing');
assert(actions.includes('beforeJson: beforeItems'), 'approval audit before/after missing');

const cookPlan = read('app/cook-plan/page.tsx');
assert(cookPlan.includes('Forecast confidence:'), 'forecast confidence badge missing');
assert(cookPlan.includes('Variance vs last plan'), 'variance explanation missing');

const system = read('app/admin/system/page.tsx');
assert(system.includes('PTT Pilot-Readiness Checklist'), 'pilot readiness checklist missing');

const packageJson = read('package.json');
assert(!packageJson.includes('--accept-data-loss'), 'render build must not use --accept-data-loss');
assert(packageJson.includes('prisma db push'), 'build should remain in db-push recovery mode for this DB');

console.log('Build 3.9.0 evaluation checks completed.');

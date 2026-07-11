import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(name, condition, detail = '') {
  if (!condition) {
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${name}`);
  }
}

function firstStatementAfterFunction(path, fnName) {
  const s = read(path);
  const marker = `export default async function ${fnName}`;
  const idx = s.indexOf(marker);
  if (idx < 0) return '';
  const snippet = s.slice(idx, idx + 500);
  const lines = snippet.split('\n').map((line) => line.trim()).filter(Boolean);
  const fnLineIndex = lines.findIndex((line) => line.includes(marker));
  return lines[fnLineIndex + 1] || '';
}

const pkg = JSON.parse(read('package.json'));
const auth = read('lib/auth.ts');
const loginRoute = read('app/api/login/route.ts');
const reportsPage = read('app/reports/page.tsx');
const exportRoute = read('app/api/reports/export/route.ts');

assert('package version', pkg.version === '2.6.0', pkg.version);
assert('nav badge', read('components/Nav.tsx').includes('Build 2.6.0'));
assert('backup build version', read('app/api/reports/backup/route.ts').includes("build: '2.6.0'"));

assert('auth uses timingSafeEqual', auth.includes('timingSafeEqual'));
assert('auth uses sha256 fixed digest', auth.includes("createHash('sha256')"));
assert('auth validates ADMIN_PASSWORD length', auth.includes("configuredSecret('ADMIN_PASSWORD')"));
assert('auth validates APP_SESSION_TOKEN length', auth.includes("configuredSecret('APP_SESSION_TOKEN')"));
assert('no fallback admin password', !loginRoute.includes("|| 'admin'") && !auth.includes("|| 'admin'"));
assert('no fallback dev token', !auth.includes("|| 'dev-token'"));
assert('login blocks missing config', loginRoute.includes('authConfigErrors'));

assert('dashboard auth before db', firstStatementAfterFunction('app/dashboard/page.tsx', 'DashboardPage').startsWith('requireAuth();'));
assert('cook plan auth before db', firstStatementAfterFunction('app/cook-plan/page.tsx', 'CookPlanPage').startsWith('requireAuth();'));
assert('end of day auth before db', firstStatementAfterFunction('app/end-of-day/page.tsx', 'EndOfDayPage').startsWith('requireAuth();'));
assert('reports auth before db', firstStatementAfterFunction('app/reports/page.tsx', 'ReportsPage').startsWith('requireAuth();'));
assert('learning auth before db', firstStatementAfterFunction('app/learning/page.tsx', 'LearningPage').startsWith('requireAuth();'));
assert('settings auth before db', firstStatementAfterFunction('app/settings/page.tsx', 'SettingsPage').startsWith('requireAuth();'));

const actions = read('app/actions.ts');
for (const fn of ['approveCookPlan', 'updateScenario', 'updateProtein', 'updateDayMultiplier', 'updateMonthMultiplier', 'deleteFutureCookPlans']) {
  assert(`server action ${fn} requires auth`, actions.includes(`export async function ${fn}`) && actions.slice(actions.indexOf(`export async function ${fn}`), actions.indexOf(`export async function ${fn}`) + 180).includes('requireAuth();'));
}

assert('reports page preserved', reportsPage.includes('Report Builder') && reportsPage.includes('Saved Reports') && reportsPage.includes('Chart View'));
assert('reports support waste by day of week', reportsPage.includes('Waste last month by day of week'));
assert('backup API exists', fs.existsSync('app/api/reports/backup/route.ts'));
assert('CSV export API protected', exportRoute.includes('apiAuthError'));
assert('learning page preserved', fs.existsSync('app/learning/page.tsx'));
assert('api cook-plan protected', read('app/api/cook-plan/route.ts').includes('apiAuthError'));
assert('api end-of-day protected', read('app/api/end-of-day/route.ts').includes('apiAuthError'));
assert('settings not overwritten by bootstrap', read('lib/bootstrap.ts').includes('update: {}'));
assert('no accept-data-loss', !read('package.json').includes('--accept-data-loss'));
assert('migration plan exists', fs.existsSync('MIGRATION_PLAN_BUILD_2_6_0.md'));

if (process.exitCode) process.exit(process.exitCode);
console.log('Build 2.6.0 evaluation checks completed.');

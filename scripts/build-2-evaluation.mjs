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

const pkg = JSON.parse(read('package.json'));
const schema = read('prisma/schema.prisma');
const reportsPage = read('app/reports/page.tsx');
const exportRoute = read('app/api/reports/export/route.ts');

assert('package version', pkg.version === '2.5.0', pkg.version);
assert('nav badge', read('components/Nav.tsx').includes('Build 2.5.0'));
assert('reports page has report builder', reportsPage.includes('Report Builder'));
assert('reports page has saved reports', reportsPage.includes('Saved Reports'));
assert('reports page has chart view', reportsPage.includes('Chart View'));
assert('reports page has full backup export', reportsPage.includes('Download full data backup JSON'));
assert('reports support waste by day of week', reportsPage.includes('Waste last month by day of week'));
assert('reports support loaded units', reportsPage.includes('Loaded / approved units'));
assert('SavedReport model exists', schema.includes('model SavedReport'));
assert('ReportRun model exists', schema.includes('model ReportRun'));
assert('saved report API exists', fs.existsSync('app/api/reports/saved/route.ts'));
assert('saved report API protected', read('app/api/reports/saved/route.ts').includes('apiAuthError'));
assert('saved report delete API exists', fs.existsSync('app/api/reports/saved/delete/route.ts'));
assert('backup API exists', fs.existsSync('app/api/reports/backup/route.ts'));
assert('backup API protected', read('app/api/reports/backup/route.ts').includes('apiAuthError'));
assert('CSV export API exists', fs.existsSync('app/api/reports/export/route.ts'));
assert('CSV export API protected', exportRoute.includes('apiAuthError'));
assert('CSV export logs report runs', exportRoute.includes('logReportRun'));
assert('raw EOD export supported', exportRoute.includes("dataset === 'eodRaw'"));
assert('raw cook-plan export supported', exportRoute.includes("dataset === 'cookPlanRaw'"));
assert('learning page preserved', fs.existsSync('app/learning/page.tsx'));
assert('api cook-plan protected', read('app/api/cook-plan/route.ts').includes('apiAuthError'));
assert('api end-of-day protected', read('app/api/end-of-day/route.ts').includes('apiAuthError'));
assert('settings not overwritten by bootstrap', read('lib/bootstrap.ts').includes('update: {}'));
assert('render build no accept-data-loss', !read('package.json').includes('--accept-data-loss'));

if (process.exitCode) process.exit(process.exitCode);
console.log('Build 2.5.0 evaluation checks completed.');

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
assert('package version', pkg.version === '2.4.0', pkg.version);
assert('nav badge', read('components/Nav.tsx').includes('Build 2.4.0'));
assert('reports page has report builder', read('app/reports/page.tsx').includes('Report Builder'));
assert('reports support EOD source', read('app/reports/page.tsx').includes('End-of-Day Logs'));
assert('reports support cook-plan source', read('app/reports/page.tsx').includes('Cook Plans'));
assert('reports support waste by day of week', read('app/reports/page.tsx').includes('Waste last month by day of week'));
assert('reports support loaded units', read('app/reports/page.tsx').includes('Loaded / approved units'));
assert('reporting helper exists', fs.existsSync('lib/reporting.ts'));
assert('reporting helper parses params', read('lib/reporting.ts').includes('parseReportParams'));
assert('reporting helper aggregates data', read('lib/reporting.ts').includes('getReportData'));
assert('CSV export API exists', fs.existsSync('app/api/reports/export/route.ts'));
assert('CSV export API protected', read('app/api/reports/export/route.ts').includes('apiAuthError'));
assert('raw EOD export supported', read('app/api/reports/export/route.ts').includes("dataset === 'eodRaw'"));
assert('raw cook-plan export supported', read('app/api/reports/export/route.ts').includes("dataset === 'cookPlanRaw'"));
assert('learning page preserved', fs.existsSync('app/learning/page.tsx'));
assert('api cook-plan protected', read('app/api/cook-plan/route.ts').includes('apiAuthError'));
assert('api end-of-day protected', read('app/api/end-of-day/route.ts').includes('apiAuthError'));
assert('settings not overwritten by bootstrap', read('lib/bootstrap.ts').includes('update: {}'));
assert('render build no accept-data-loss', !read('package.json').includes('--accept-data-loss'));

if (process.exitCode) process.exit(process.exitCode);
console.log('Build 2.4.0 evaluation checks completed.');

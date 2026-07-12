import fs from 'fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(name, condition) {
  if (!condition) {
    console.error(`FAIL: ${name}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${name}`);
  }
}

const pkg = JSON.parse(read('package.json'));
assert('package version 3.0.0', pkg.version === '3.0.0');
assert('render build does not use accept-data-loss', !read('package.json').includes('--accept-data-loss'));

const schema = read('prisma/schema.prisma');
assert('Restaurant model exists', schema.includes('model Restaurant'));
assert('RestaurantMembership model exists', schema.includes('model RestaurantMembership'));
assert('AuditLog model exists', schema.includes('model AuditLog'));
for (const model of ['User','Protein','ForecastScenario','DayMultiplier','MonthMultiplier','SavedReport','ReportRun','CookPlan','EndOfDayLog']) {
  const start = schema.indexOf(`model ${model} {`);
  const end = schema.indexOf('\n}', start);
  const block = schema.slice(start, end);
  assert(`${model} has restaurantId`, block.includes('restaurantId'));
}
assert('CookPlan serviceDate no longer globally unique', !schema.includes('serviceDate     DateTime @unique'));
assert('EndOfDayLog serviceDate no longer globally unique', !schema.includes('serviceDate    DateTime @unique'));
assert('Protein name no longer globally unique', !schema.includes('name                String      @unique'));
assert('Scenario name no longer globally unique', !schema.includes('name             String       @unique'));

const tenant = read('lib/tenant.ts');
assert('tenant helper exists', tenant.includes('currentRestaurantForUser'));
assert('default restaurant helper exists', tenant.includes('ensureDefaultRestaurant'));
assert('audit helper exists', tenant.includes('auditLog'));

const bootstrap = read('lib/bootstrap.ts');
assert('bootstrap creates default restaurant', bootstrap.includes('ensureDefaultRestaurant'));
assert('bootstrap attaches legacy records', bootstrap.includes('updateMany({ where: { restaurantId: null }'));
assert('activeScenarioWhere accepts restaurantId', bootstrap.includes('activeScenarioWhere(restaurantId?: string)'));

const criticalFiles = [
  'app/dashboard/page.tsx',
  'app/cook-plan/page.tsx',
  'app/end-of-day/page.tsx',
  'app/settings/page.tsx',
  'app/reports/page.tsx',
  'app/learning/page.tsx',
  'app/admin/users/page.tsx',
  'app/api/cook-plan/route.ts',
  'app/api/end-of-day/route.ts',
  'app/api/eod-status/route.ts',
  'app/api/reports/export/route.ts',
  'app/api/reports/backup/route.ts'
];
for (const file of criticalFiles) {
  const body = read(file);
  assert(`${file} resolves current restaurant`, body.includes('currentRestaurantForUser'));
  assert(`${file} includes restaurantId scoping`, body.includes('restaurantId'));
}

assert('reporting requires restaurantId argument', read('lib/reporting.ts').includes('getReportData(params: ReportParams, restaurantId: string)'));
assert('cook plan generation deletes only same tenant date', read('app/api/cook-plan/route.ts').includes('deleteMany({ where: { restaurantId, serviceDate: loadDate } })'));
assert('EOD save finds same tenant date', read('app/api/end-of-day/route.ts').includes('findFirst({ where: { serviceDate, restaurantId } })'));
assert('user management scopes users by restaurant', read('app/admin/users/page.tsx').includes('where: { restaurantId }'));
assert('user creation creates restaurant membership', read('app/admin/users/actions.ts').includes('restaurantMembership.create'));
assert('nav build badge 3.0.0', read('components/Nav.tsx').includes('Build 3.0.0'));
assert('Build 3.0.0 test report exists', fs.existsSync('TEST_REPORT_BUILD_3_0_0.md'));

if (process.exitCode) process.exit(1);
console.log('Build 3.0.0 evaluation checks completed.');

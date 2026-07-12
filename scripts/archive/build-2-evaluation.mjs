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
assert('package version 2.7.1', pkg.version === '2.7.1');
assert('render build does not use accept-data-loss', !read('package.json').includes('--accept-data-loss'));

const schema = read('prisma/schema.prisma');
assert('User has username field', schema.includes('username     String?'));
assert('User username unique constraint removed for safe db push', !schema.includes('username     String?  @unique'));
assert('User has passwordHash', schema.includes('passwordHash String?'));
assert('ADMIN role exists', schema.includes('ADMIN'));
assert('OWNER role exists', schema.includes('OWNER'));
assert('KITCHEN_MANAGER role exists', schema.includes('KITCHEN_MANAGER'));
assert('KITCHEN_CREW role exists', schema.includes('KITCHEN_CREW'));

const auth = read('lib/auth.ts');
assert('signed per-user session cookie', auth.includes('signUserId') && auth.includes('setSessionCookie(userId'));
assert('role guard exists', auth.includes('requireRole') && auth.includes('requireApiRole'));
assert('password hashing exists', read('lib/password.ts').includes('pbkdf2Sync'));
assert('login uses username/email findFirst', read('app/api/login/route.ts').includes('findFirst') && read('app/api/login/route.ts').includes('OR: [{ username }, { email: username }]'));
assert('login verifies password hash', read('app/api/login/route.ts').includes('verifyPassword'));
assert('admin users page exists', fs.existsSync('app/admin/users/page.tsx'));
assert('admin users actions exist', fs.existsSync('app/admin/users/actions.ts'));
assert('user creation checks duplicate username/email', read('app/admin/users/actions.ts').includes('OR: [{ username }, { email }]'));

const nav = read('components/Nav.tsx');
assert('nav build badge 2.7.1', nav.includes('Build 2.7.1'));
assert('nav shows Users for admin owner', nav.includes("['Users', '/admin/users', ['ADMIN', 'OWNER']]"));
assert('nav shows Cook Plan to crew', nav.includes("['Cook Plan', '/cook-plan', ['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW']]"));

const cookPage = read('app/cook-plan/page.tsx');
assert('cook plan page allows crew read', cookPage.includes("requireRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW'])"));
assert('cook plan page has canManagePlan gate', cookPage.includes('const canManagePlan = hasRole'));
assert('crew sees read-only cook plan message', cookPage.includes('Kitchen Crew can view the current cook plan'));
assert('create forecast is gated to managers', cookPage.includes('canManagePlan ? <section className="card p-5">'));
assert('approval form is gated to managers', cookPage.includes('canManagePlan ? <form action={approveCookPlan}'));

assert('cook plan API still manager-only', read('app/api/cook-plan/route.ts').includes("requireApiRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER'])"));
assert('EOD API allows crew', read('app/api/end-of-day/route.ts').includes("'KITCHEN_CREW'"));
assert('settings restricted to admin owner', read('app/settings/page.tsx').includes("requireRole(['ADMIN', 'OWNER'])"));
assert('backup export owner/admin only', read('app/api/reports/backup/route.ts').includes("requireApiRole(['ADMIN', 'OWNER'])"));

for (const path of fs.readdirSync('app/api', { recursive: true }).filter(p => String(p).endsWith('route.ts')).map(p => `app/api/${p}`)) {
  const body = read(path);
  assert(`${path} does not wrap auth NextResponse in JSON`, !body.includes('NextResponse.json(authError'));
}

assert('Build 2.7.1 test report exists', fs.existsSync('TEST_REPORT_BUILD_2_7_1.md'));

if (process.exitCode) process.exit(1);
console.log('Build 2.7.1 evaluation checks completed.');

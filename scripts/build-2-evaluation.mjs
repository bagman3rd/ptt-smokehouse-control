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
assert('package version 2.7.0', pkg.version === '2.7.0');
const schema = read('prisma/schema.prisma');
assert('User has username', schema.includes('username     String?  @unique'));
assert('User has passwordHash', schema.includes('passwordHash String?'));
assert('ADMIN role exists', schema.includes('ADMIN'));
assert('OWNER role exists', schema.includes('OWNER'));
assert('KITCHEN_MANAGER role exists', schema.includes('KITCHEN_MANAGER'));
assert('KITCHEN_CREW role exists', schema.includes('KITCHEN_CREW'));
const auth = read('lib/auth.ts');
assert('signed per-user session cookie', auth.includes('signUserId') && auth.includes('setSessionCookie(userId'));
assert('role guard exists', auth.includes('requireRole') && auth.includes('requireApiRole'));
assert('password hashing exists', read('lib/password.ts').includes('pbkdf2Sync'));
assert('login uses username/email', read('app/api/login/route.ts').includes('OR: [{ username }, { email: username }]'));
assert('login verifies password hash', read('app/api/login/route.ts').includes('verifyPassword'));
assert('admin users page exists', fs.existsSync('app/admin/users/page.tsx'));
assert('admin users actions exist', fs.existsSync('app/admin/users/actions.ts'));
assert('nav shows Users for admin owner', read('components/Nav.tsx').includes("['Users', '/admin/users', ['ADMIN', 'OWNER']]"));
assert('cook plan page restricted to KM+', read('app/cook-plan/page.tsx').includes("requireRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER'])"));
assert('settings restricted to admin owner', read('app/settings/page.tsx').includes("requireRole(['ADMIN', 'OWNER'])"));
assert('end of day allows crew', read('app/end-of-day/page.tsx').includes("'KITCHEN_CREW'"));
assert('cook plan API role protected', read('app/api/cook-plan/route.ts').includes("requireApiRole(['ADMIN', 'OWNER', 'KITCHEN_MANAGER'])"));
assert('EOD API allows crew', read('app/api/end-of-day/route.ts').includes("'KITCHEN_CREW'"));
assert('backup export owner/admin only', read('app/api/reports/backup/route.ts').includes("requireApiRole(['ADMIN', 'OWNER'])"));
assert('initial admin seeded from env', read('lib/bootstrap.ts').includes("username: 'admin'") && read('lib/bootstrap.ts').includes('hashPassword(adminPassword)'));

if (process.exitCode) process.exit(1);
console.log('Build 2.7.0 evaluation checks completed.');

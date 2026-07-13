import fs from 'node:fs';
function assert(ok, message) { if (!ok) throw new Error(message); }
const home = fs.readFileSync('app/page.tsx', 'utf8');
const login = fs.readFileSync('app/api/login/route.ts', 'utf8');
const auth = fs.readFileSync('lib/auth.ts', 'utf8');
const guard = fs.readFileSync('lib/tenantGuard.ts', 'utf8');
const nav = fs.readFileSync('components/NavMenu.tsx', 'utf8');
const ci = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
assert(home.includes("redirect('/today')"), 'Root route must land on Today.');
assert(login.includes('`${baseUrl}/today`'), 'Successful login must land on Today.');
assert(auth.includes('privilegedOnlyRoute'), '2FA enforcement must not block mixed-role operational routes.');
assert(guard.includes("process.env.TENANT_GUARD_ENABLED === '1'"), 'Tenant guard must support explicit strict mode.');
assert(guard.includes("process.env.NODE_ENV !== 'production'"), 'Production must not enable the assertion implicitly.');
assert(ci.includes('TENANT_GUARD_ENABLED: "1"'), 'CI guard job must explicitly enable strict tenant assertions.');
assert(!nav.includes('<details') && !nav.includes('<summary'), 'Top navigation must not use dropdown controls.');
assert(nav.includes('data-testid="nav-link-today"'), 'Today direct link must exist.');
console.log('Build 7.5.1 landing, navigation, and production-runtime regression checks passed.');

import fs from 'node:fs';
function assert(ok, message) { if (!ok) throw new Error(message); }
const eod = fs.readFileSync('app/api/end-of-day/route.ts', 'utf8');
const guard = fs.readFileSync('lib/tenantGuard.ts', 'utf8');
const auth = fs.readFileSync('lib/auth.ts', 'utf8');
const ci = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
assert(eod.includes('update: { ...row, restaurantId }'), 'Quick EOD upsert update must carry restaurantId');
assert(!guard.includes("process.env.NODE_ENV !== 'production'"), 'Tenant guard must not switch off in production');
assert(guard.includes("process.env.DISABLE_TENANT_GUARD !== '1'"), 'Tenant guard maintenance bypass must be explicit');
assert(auth.includes('requireApiUserRole'), 'Single-pass API auth context is required');
assert(ci.includes('test:e2e:guard'), 'CI must run dev-mode tenant-guard E2E');
console.log('Build 7.5.0 defect regression checks passed.');

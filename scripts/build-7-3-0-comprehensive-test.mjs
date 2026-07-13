#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');
const pkg = JSON.parse(read('package.json'));
assert.equal(pkg.version, '7.3.0');
assert.ok(existsSync('pnpm-lock.yaml'), 'deterministic lockfile missing');

const quick = read('app/end-of-day/QuickEndOfDayForm.tsx');
assert.ok(quick.includes('step="1"'), 'sealed quantities must use integer step');
assert.ok(quick.includes('Number.isInteger(row.sealedUnopenedUnits)'), 'client must reject decimal sealed quantities');
for (const code of ['BRISKET','PORK','CHICKEN','RIBS']) assert.ok(quick.includes(`{ code: '${code}'`), `missing core protein ${code}`);
assert.ok(quick.includes('quick-eod-sealed-${code}'), 'missing sealed field test-id template');
assert.ok(quick.includes('quick-eod-opened-${code}'), 'missing opened field test-id template');

const api = read('app/api/end-of-day/route.ts');
assert.ok(api.includes('!Number.isInteger(sealedUnopenedUnits)'), 'API must reject decimal sealed quantities');
assert.ok(api.includes('PROTEIN_CODE.PORK') && api.includes('PROTEIN_CODE.CHICKEN') && api.includes('PROTEIN_CODE.RIBS'), 'carryover rule missing');
assert.ok(api.includes("? sealedUnopenedUnits : 0"), 'quick EOD next-load credit rule missing');

const auth = read('lib/auth.ts');
assert.ok(auth.includes('sessionVersion') && auth.includes('userSession'), 'durable session validation missing');
assert.ok(auth.includes('timingSafeEqual'), 'constant-time signature check missing');

const tenant = read('lib/tenantGuard.ts');
assert.ok(tenant.includes('restaurantId'), 'tenant guard must enforce restaurant context');

const ci = read('.github/workflows/ci.yml');
for (const required of ['pnpm install --frozen-lockfile','test:e2e','test:restore-drill','test:load-smoke']) {
  assert.ok(ci.includes(required), `CI missing ${required}`);
}
assert.ok(ci.includes('pnpm run prisma:migrate') || ci.includes('prisma migrate deploy'), 'CI missing migration deployment');

const health = read('app/api/health/db/route.ts');
assert.ok(!health.includes('error.message'), 'database health endpoint must not expose raw errors');

console.log('Build 7.3.0 comprehensive static acceptance checks passed.');

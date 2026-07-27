// Build 11.0.0 — static contract test for cost controls, retention, GDPR,
// AI safety wiring, and security headers.
// Run: pnpm exec tsx scripts/hardening-contract-test.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';

const cost = fs.readFileSync('lib/cost.ts', 'utf8');
const archer = fs.readFileSync('app/api/archer/route.ts', 'utf8');
const retention = fs.readFileSync('lib/retention.ts', 'utf8');
const nextConfig = fs.readFileSync('next.config.mjs', 'utf8');
const exportRoute = fs.readFileSync('app/api/account/export/route.ts', 'utf8');
const privacyActions = fs.readFileSync('app/account/privacy/actions.ts', 'utf8');
const retentionCron = fs.readFileSync('app/api/cron/retention/route.ts', 'utf8');
const digestCron = fs.readFileSync('app/api/cron/daily-digest/route.ts', 'utf8');

// --- AI cost caps ---
assert.match(cost, /AI_MAX_TOKENS_PER_CONVERSATION/, 'per-conversation token cap defined');
assert.match(cost, /AI_DAILY_CENTS_CAP_PER_RESTAURANT/, 'per-restaurant daily cap defined');
assert.match(cost, /aiSpendAllowed/, 'spend-allowed check exists');
assert.match(cost, /recordAiUsage/, 'usage recording exists');

// --- Archer route enforces caps + safety before calling the model ---
assert.match(archer, /aiSpendAllowed/, 'archer checks daily spend cap');
assert.match(archer, /AI_MAX_TOKENS_PER_CONVERSATION/, 'archer enforces token ceiling');
assert.match(archer, /screenUserMessage/, 'archer screens for injection');
assert.match(archer, /redactPii/, 'archer redacts PII before logging');
assert.match(archer, /recordAiUsage/, 'archer records usage/cost');
// The spend check must occur before the OpenAI fetch.
const spendIdx = archer.indexOf('aiSpendAllowed');
const fetchIdx = archer.indexOf('api.openai.com');
assert.ok(spendIdx > -1 && fetchIdx > -1 && spendIdx < fetchIdx, 'spend cap checked before model call');

// --- Retention + GDPR erasure ---
assert.match(retention, /purgeAiLogs/, 'AI log purge exists');
assert.match(retention, /purgeNotificationLogs/, 'notification purge exists');
assert.match(retention, /eraseRestaurantPersonalData/, 'GDPR erasure exists');
assert.match(retention, /anonymized/i, 'erasure anonymizes rather than hard-deletes audit');
assert.match(retention, /Deleted User/, 'erasure scrubs user name');
assert.match(retention, /retentionJobRun/i, 'retention runs are logged');

// --- Data export (portability) ---
assert.match(exportRoute, /requireApiRole\(\['ADMIN', 'OWNER'\]\)/, 'export gated to admin/owner');
assert.match(exportRoute, /Content-Disposition/, 'export is a file download');
assert.match(exportRoute, /DATA_EXPORT/, 'export is audit logged');

// --- Deletion request uses signed, expiring confirmation ---
assert.match(privacyActions, /signToken/, 'deletion uses signed token');
assert.match(privacyActions, /60 \* 60 \* 24/, 'confirmation expires in 24h');
assert.match(privacyActions, /data_deletion_confirm/, 'confirmation email sent');

// --- Cron endpoints require bearer secret ---
for (const [name, src] of [['retention', retentionCron], ['daily-digest', digestCron]]) {
  assert.match(src, /CRON_SECRET/, `${name} cron requires secret`);
  assert.match(src, /Bearer /, `${name} cron uses bearer auth`);
}

// --- Security headers ---
for (const h of [
  'Strict-Transport-Security',
  'X-Frame-Options',
  'X-Content-Type-Options',
  'Content-Security-Policy',
  'Referrer-Policy',
  'Permissions-Policy'
]) {
  assert.match(nextConfig, new RegExp(h), `security header ${h} present`);
}
assert.match(nextConfig, /poweredByHeader: false/, 'x-powered-by disabled');

console.log('hardening-contract-test: all assertions passed');

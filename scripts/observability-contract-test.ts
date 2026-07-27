// Build 11.0.1 — observability contract test (v3.0 §41).
// Verifies real error tracking exists (not just a comment) and the deploy
// health / rollback workflow is wired.
// Run: pnpm exec tsx scripts/observability-contract-test.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';

const obs = fs.readFileSync('lib/observability.ts', 'utf8');
const instr = fs.readFileSync('instrumentation.ts', 'utf8');
const digest = fs.readFileSync('app/api/cron/daily-digest/route.ts', 'utf8');
const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Real capture pipeline, not a comment.
assert.match(obs, /export async function captureException/, 'captureException exported');
assert.match(obs, /export async function captureMessage/, 'captureMessage exported');
assert.match(obs, /errorEvent\.create/, 'errors persisted to ErrorEvent');
assert.match(obs, /forwardToSentry/, 'Sentry transport present');
assert.match(obs, /SENTRY_DSN/, 'activates on SENTRY_DSN');
assert.match(obs, /X-Sentry-Auth/, 'uses Sentry ingest auth header');

// Deploy health / rollback decision workflow (§40/§41).
assert.match(obs, /export async function recordDeploy/, 'recordDeploy exported');
assert.match(obs, /export async function evaluateDeployHealth/, 'evaluateDeployHealth exported');
assert.match(obs, /DEPLOY_ERROR_ROLLBACK_THRESHOLD/, 'rollback threshold configurable');
assert.match(obs, /recommendation: healthy \? 'HEALTHY' : 'ROLLBACK'/, 'rollback recommendation emitted');

// Instrumentation registers global capture.
assert.match(instr, /export async function register/, 'instrumentation register hook');
assert.match(instr, /onRequestError/, 'onRequestError hook captures uncaught errors');
assert.match(instr, /captureException/, 'instrumentation forwards to capture');

// Daily digest consumes real error counts.
assert.match(digest, /errorCountSince/, 'digest reads real error counts');
assert.match(digest, /serverErrors24h/, 'digest reports server errors');
assert.match(digest, /ERROR_ALERT_THRESHOLD_24H/, 'digest alerts on error surge');

// Schema has the ErrorEvent model.
assert.match(schema, /model ErrorEvent \{/, 'ErrorEvent model present');
assert.match(schema, /fingerprint\s+String/, 'ErrorEvent has fingerprint for grouping');

console.log('observability-contract-test: all assertions passed');

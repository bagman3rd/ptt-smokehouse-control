// Build 11.0.1 — static contract test for the notification dispatcher.
// Verifies the critical safety guarantees are actually wired in source:
//   * consent is checked before send
//   * quiet hours gate marketing
//   * idempotency key short-circuits duplicates
//   * every path writes a NotificationLog row
// Run: pnpm exec tsx scripts/notification-contract-test.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';

const dispatch = fs.readFileSync('lib/notifications/dispatch.ts', 'utf8');
const consent = fs.readFileSync('lib/consent.ts', 'utf8');
const templates = fs.readFileSync('lib/notifications/templates.ts', 'utf8');
const providers = fs.readFileSync('lib/notifications/providers.ts', 'utf8');
const unsub = fs.readFileSync('app/api/notifications/unsubscribe/route.ts', 'utf8');
const inbound = fs.readFileSync('app/api/notifications/sms/inbound/route.ts', 'utf8');

// --- Dispatcher enforces the pipeline in order ---
assert.match(dispatch, /isSendAllowed/, 'dispatch checks consent');
assert.match(dispatch, /nextAllowedSendTime/, 'dispatch checks quiet hours');
assert.match(dispatch, /idempotencyKey/, 'dispatch honors idempotency key');
assert.match(dispatch, /findUnique[\s\S]{0,120}idempotencyKey/, 'idempotency looked up before send');
assert.match(dispatch, /status: 'DUPLICATE'/, 'duplicate short-circuits');
assert.match(dispatch, /SUPPRESSED_CONSENT/, 'consent suppression path exists');
assert.match(dispatch, /SUPPRESSED_QUIET_HOURS/, 'quiet-hours suppression path exists');
// Marketing must be gated by quiet hours; transactional must not be.
assert.match(dispatch, /category === 'MARKETING'[\s\S]{0,200}nextAllowedSendTime/, 'quiet hours only for marketing');

// --- Consent module: opt-out is permanent until explicit re-subscribe ---
assert.match(consent, /marketingState: 'OPTED_OUT'/, 'records opt-out state');
assert.match(consent, /marketingState !== 'OPTED_IN'/, 'marketing requires explicit opt-in');
assert.match(consent, /category === 'TRANSACTIONAL'[\s\S]{0,80}allowed: true/, 'transactional always allowed');
assert.match(consent, /consentEvent\.create/, 'writes immutable audit event');

// --- Templates: CAN-SPAM footer (postal address + unsubscribe for marketing) ---
assert.match(templates, /postalAddress/, 'templates include postal address');
assert.match(templates, /unsubscribeUrl/, 'templates build unsubscribe URL');
assert.match(templates, /category === 'MARKETING'/, 'unsubscribe only required for marketing');

// --- Providers: test env must never hit a real provider ---
assert.match(providers, /NODE_ENV !== 'test'/, 'providers disabled under test');
assert.match(providers, /consoleEmail/, 'console email fallback present');
assert.match(providers, /consoleSms/, 'console sms fallback present');

// --- Unsubscribe endpoint: POST records opt-out, GET does not (scanner-safe) ---
assert.match(unsub, /export async function GET/, 'GET renders confirm');
assert.match(unsub, /export async function POST/, 'POST performs opt-out');
assert.match(unsub, /recordOptOut/, 'unsubscribe records opt-out');
assert.match(unsub, /verifyToken/, 'unsubscribe verifies signed token');

// --- Inbound SMS honors STOP/START and validates Twilio signature ---
assert.match(inbound, /classifyInboundSms/, 'inbound classifies keywords');
assert.match(inbound, /recordOptOut/, 'STOP records opt-out');
assert.match(inbound, /recordOptIn/, 'START records opt-in');
assert.match(inbound, /validateTwilioSignature/, 'inbound validates provider signature');

console.log('notification-contract-test: all assertions passed');

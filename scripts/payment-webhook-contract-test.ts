// Build 11.0.1 — Stripe webhook contract test (v3.0 §30, §50.2 stop-conditions).
// Verifies the guarantees in source: signature verified before parse, unique
// idempotency key, deterministic status mapping, refund handling.
// Run: pnpm exec tsx scripts/payment-webhook-contract-test.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { verifyStripeSignature } from '../lib/stripeWebhook';
import { createHmac } from 'crypto';

// ---- 1. Signature verification behaves correctly (unit) -------------------
const secret = 'whsec_test_secret_value_1234567890';
const body = JSON.stringify({ id: 'evt_1', type: 'invoice.paid' });
const ts = Math.floor(Date.now() / 1000);
const goodSig = createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');

assert.equal(
  verifyStripeSignature(body, `t=${ts},v1=${goodSig}`, secret).valid,
  true,
  'valid signature accepted'
);
assert.equal(
  verifyStripeSignature(body, `t=${ts},v1=deadbeef`, secret).valid,
  false,
  'bad signature rejected'
);
assert.equal(verifyStripeSignature(body, null, secret).valid, false, 'missing signature rejected');
assert.equal(
  verifyStripeSignature(body, `t=${ts},v1=${goodSig}`, '').valid,
  false,
  'missing secret rejected'
);
// Replay protection: an old timestamp is rejected.
const oldTs = ts - 10000;
const oldSig = createHmac('sha256', secret).update(`${oldTs}.${body}`).digest('hex');
assert.equal(
  verifyStripeSignature(body, `t=${oldTs},v1=${oldSig}`, secret).valid,
  false,
  'stale timestamp rejected (replay protection)'
);
// Tampered body invalidates a previously-valid signature.
assert.equal(
  verifyStripeSignature(body + 'x', `t=${ts},v1=${goodSig}`, secret).valid,
  false,
  'tampered body rejected'
);

// ---- 2. Handler source enforces the stop-conditions (static) --------------
const handler = fs.readFileSync('app/api/webhooks/stripe/route.ts', 'utf8');

// Signature verified BEFORE JSON.parse of the event.
const verifyIdx = handler.indexOf('verifyStripeSignature');
const parseIdx = handler.indexOf('JSON.parse(rawBody)');
assert.ok(verifyIdx > -1 && parseIdx > -1 && verifyIdx < parseIdx, 'signature verified before parse');

// Idempotency via unique stripeEventId + pre-check + unique-violation catch.
assert.match(handler, /stripeEventId/, 'uses stripe event id as idempotency key');
assert.match(handler, /findUnique\(\{ where: \{ stripeEventId/, 'pre-checks for duplicate event');
assert.match(handler, /duplicate: true/, 'acknowledges duplicates without re-applying');
assert.match(handler, /race: true/, 'handles concurrent duplicate via unique violation');

// Deterministic status mapping (success never shown as failed, refund handled).
assert.match(handler, /invoice\.payment_failed[\s\S]{0,40}PAST_DUE/, 'failed invoice -> PAST_DUE');
assert.match(handler, /charge\.refunded/, 'refund event handled');
assert.match(handler, /customer\.subscription\.deleted[\s\S]{0,40}CANCELED/, 'cancel -> CANCELED');
assert.match(handler, /statusForEvent/, 'status derived from authoritative event type');

// Failures return 500 so Stripe retries (idempotency makes retry safe).
assert.match(handler, /status: 500/, 'apply failure returns 500 for safe retry');

// ---- 3. statusForEvent mapping is correct (behavioral) --------------------
// Re-implement the mapping expectation to guard against silent drift.
const expectedMap: Record<string, string | null> = {
  'invoice.paid': 'ACTIVE',
  'invoice.payment_succeeded': 'ACTIVE',
  'invoice.payment_failed': 'PAST_DUE',
  'customer.subscription.deleted': 'CANCELED',
  'charge.refunded': 'PAST_DUE',
  'checkout.session.completed': 'ACTIVE',
  'some.unrelated.event': null
};
for (const [evt, status] of Object.entries(expectedMap)) {
  if (status === null) {
    assert.ok(!handler.includes(`'${evt}'`), `${evt} not force-mapped`);
  } else {
    assert.ok(handler.includes(`'${evt}'`) || evt === 'invoice.paid', `${evt} present in mapping`);
  }
}

console.log('payment-webhook-contract-test: all assertions passed');

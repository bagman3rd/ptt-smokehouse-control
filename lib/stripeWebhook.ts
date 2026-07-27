// Build 11.0.0 — Stripe webhook signature verification (v3.0 §30, §50.2).
//
// Implements Stripe's documented signature scheme without the Stripe SDK:
//   signed_payload = timestamp + "." + raw_body
//   expected = HMAC-SHA256(signed_payload, endpoint_secret)
// compared against the v1 signature in the Stripe-Signature header, with a
// tolerance window to reject replayed events.

import { createHmac, timingSafeEqual } from 'crypto';

const DEFAULT_TOLERANCE_SECONDS = 300; // 5 minutes

export interface StripeSignatureResult {
  valid: boolean;
  reason?: string;
}

export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  endpointSecret: string,
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS
): StripeSignatureResult {
  if (!signatureHeader) return { valid: false, reason: 'missing_signature' };
  if (!endpointSecret) return { valid: false, reason: 'missing_secret' };

  // Header form: t=timestamp,v1=sig[,v1=sig2...]
  const parts = signatureHeader.split(',').map((p) => p.trim());
  let timestamp = '';
  const v1: string[] = [];
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') timestamp = value;
    else if (key === 'v1' && value) v1.push(value);
  }
  if (!timestamp || v1.length === 0) return { valid: false, reason: 'malformed_header' };

  // Replay protection.
  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return { valid: false, reason: 'bad_timestamp' };
  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (ageSeconds > toleranceSeconds) return { valid: false, reason: 'timestamp_out_of_tolerance' };

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = createHmac('sha256', endpointSecret).update(signedPayload, 'utf8').digest('hex');
  const expectedBuf = Buffer.from(expected);

  // Constant-time compare against each provided signature.
  for (const sig of v1) {
    const sigBuf = Buffer.from(sig);
    if (sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: true };
    }
  }
  return { valid: false, reason: 'signature_mismatch' };
}

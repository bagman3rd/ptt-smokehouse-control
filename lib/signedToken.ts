// Build 10.0.0 — stateless signed tokens for unsubscribe / confirmation links.
// Format: base64url(payloadJson).hmacSha256Hex
// The payload includes an `exp` epoch-seconds field for expiry.

import { createHmac, timingSafeEqual } from 'crypto';

function secret(): string {
  const value = process.env.APP_SESSION_TOKEN || process.env.LINK_SIGNING_SECRET || '';
  if (value.trim().length < 24) {
    throw new Error('Signing secret (APP_SESSION_TOKEN) must be at least 24 characters.');
  }
  return value;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

export interface TokenPayload {
  purpose: string; // "unsubscribe" | "delete_account" | ...
  channel?: string;
  destination?: string;
  restaurantId?: string;
  userId?: string;
  exp: number; // epoch seconds
}

export function signToken(payload: Omit<TokenPayload, 'exp'>, ttlSeconds: number): string {
  const full: TokenPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const body = b64url(JSON.stringify(full));
  const sig = createHmac('sha256', secret()).update(body).digest('hex');
  return `${body}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', secret()).update(body).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

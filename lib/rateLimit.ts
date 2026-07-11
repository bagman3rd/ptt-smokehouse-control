import { NextResponse } from 'next/server';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function ipFromRequest(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for') || '';
  const first = forwarded.split(',')[0]?.trim();
  return first || request.headers.get('x-real-ip') || 'unknown-ip';
}

export function rateLimitKey(request: Request, scope: string, discriminator = '') {
  return `${scope}:${ipFromRequest(request)}:${discriminator.toLowerCase().slice(0, 80)}`;
}

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  current.count += 1;
  buckets.set(key, current);
  return { ok: current.count <= limit, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt };
}

export function rateLimitResponse(resetAt: number) {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { ok: false, message: `Too many requests. Try again in ${retryAfter} seconds.` },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}

export function enforceRateLimit(request: Request, scope: string, limit = 60, windowMs = 60_000, discriminator = '') {
  const result = checkRateLimit(rateLimitKey(request, scope, discriminator), limit, windowMs);
  if (!result.ok) return rateLimitResponse(result.resetAt);
  return null;
}

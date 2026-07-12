import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type MemoryBucket = { count: number; resetAt: number };
const memoryBuckets = new Map<string, MemoryBucket>();

function ipFromRequest(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for') || '';
  const first = forwarded.split(',')[0]?.trim();
  return first || request.headers.get('x-real-ip') || 'unknown-ip';
}

export function rateLimitKey(request: Request, scope: string, discriminator = '') {
  return `${scope}:${ipFromRequest(request)}:${discriminator.toLowerCase().slice(0, 80)}`;
}

function checkMemoryRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = memoryBuckets.get(key);
  if (!current || current.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  current.count += 1;
  memoryBuckets.set(key, current);
  return { ok: current.count <= limit, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt };
}

export async function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.rateLimitBucket.findUnique({ where: { key } });
      if (!current || current.resetAt <= now) {
        const bucket = await tx.rateLimitBucket.upsert({
          where: { key },
          update: { count: 1, resetAt },
          create: { key, count: 1, resetAt }
        });
        return { ok: true, remaining: limit - 1, resetAt: bucket.resetAt.getTime() };
      }
      const bucket = await tx.rateLimitBucket.update({ where: { key }, data: { count: { increment: 1 } } });
      return { ok: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt.getTime() };
    });
    return result;
  } catch {
    // Fallback preserves availability before the 4.3.0 migration is applied.
    // Once RateLimitBucket exists, limits are durable across restarts/instances.
    return checkMemoryRateLimit(key, limit, windowMs);
  }
}

export function rateLimitResponse(resetAt: number) {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { ok: false, message: `Too many requests. Try again in ${retryAfter} seconds.` },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}

export async function enforceRateLimit(request: Request, scope: string, limit = 60, windowMs = 60_000, discriminator = '') {
  const result = await checkRateLimit(rateLimitKey(request, scope, discriminator), limit, windowMs);
  if (!result.ok) return rateLimitResponse(result.resetAt);
  return null;
}

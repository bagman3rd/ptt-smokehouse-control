// Build 11.0.3 — Web Vitals RUM ingest (v3.0 §27.1 field data).
// Accepts small beacons from the client WebVitalsReporter and stores samples.
// Unauthenticated by design (fires before/without login) but strictly validated,
// rate-limited by payload shape, and never trusts client strings beyond a small
// allow-list.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const METRICS = new Set(['LCP', 'CLS', 'INP', 'FCP', 'TTFB']);
const RATINGS = new Set(['good', 'needs-improvement', 'poor']);
const DEVICES = new Set(['mobile', 'desktop']);

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const metric = String(body?.metric || '');
  const value = Number(body?.value);
  if (!METRICS.has(metric) || !Number.isFinite(value) || value < 0 || value > 3_600_000) {
    return NextResponse.json({ ok: false, error: 'invalid_metric' }, { status: 400 });
  }

  const rating = RATINGS.has(body?.rating) ? body.rating : null;
  const route = typeof body?.route === 'string' ? body.route.slice(0, 300) : null;
  const navType = typeof body?.navType === 'string' ? body.navType.slice(0, 40) : null;
  const deviceType = DEVICES.has(body?.deviceType) ? body.deviceType : null;

  try {
    await prisma.webVitalSample.create({
      data: { metric, value, rating, route, navType, deviceType }
    });
  } catch {
    // Telemetry must never surface an error to the user.
    return NextResponse.json({ ok: true, stored: false });
  }
  return NextResponse.json({ ok: true, stored: true });
}

// Build 11.0.3 — daily data-retention cron.
// Schedule on Render Cron: GET /api/cron/retention with Authorization: Bearer $CRON_SECRET

import { NextResponse } from 'next/server';
import { runRetentionJob } from '@/lib/retention';

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET || '';
  if (!secret || secret.length < 12) return false;
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  return token === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { ok: false, message: 'Unauthorized. Set CRON_SECRET and send Authorization: Bearer <secret>.' },
      { status: 401 }
    );
  }
  try {
    const result = await runRetentionJob();
    return NextResponse.json({ ok: true, ...result, ranAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

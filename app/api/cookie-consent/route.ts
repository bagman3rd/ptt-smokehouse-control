// Build 10.0.0 — server-side cookie-consent audit record.
// Stores an anonymous visitor's choices so we can demonstrate consent if asked.

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';

const VISITOR_COOKIE = 'shc_visitor';

export async function POST(req: NextRequest) {
  let body: { functional?: boolean; analytics?: boolean; marketing?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let visitorId = req.cookies.get(VISITOR_COOKIE)?.value;
  const res = NextResponse.json({ ok: true });
  if (!visitorId) {
    visitorId = randomUUID();
    res.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365,
      path: '/'
    });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  try {
    await prisma.cookieConsent.upsert({
      where: { visitorId },
      update: {
        functional: Boolean(body.functional),
        analytics: Boolean(body.analytics),
        marketing: Boolean(body.marketing),
        ipAddress: ip,
        userAgent: req.headers.get('user-agent')
      },
      create: {
        visitorId,
        functional: Boolean(body.functional),
        analytics: Boolean(body.analytics),
        marketing: Boolean(body.marketing),
        ipAddress: ip,
        userAgent: req.headers.get('user-agent')
      }
    });
  } catch {
    // Non-blocking; the client cookie is the source of truth for behavior.
  }

  return res;
}

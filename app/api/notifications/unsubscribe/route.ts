// Build 11.0.3 — CAN-SPAM unsubscribe endpoint.
// GET  renders a one-click confirmation (email clients pre-fetch links, so we
//      confirm on POST to avoid accidental unsubscribes from scanners).
// POST records the opt-out immediately and suppresses future marketing sends.

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/signedToken';
import { recordOptOut, type Channel } from '@/lib/consent';

function page(bodyHtml: string): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title></head>
<body style="font-family:system-ui,sans-serif;max-width:480px;margin:48px auto;padding:0 16px;color:#0f172a">${bodyHtml}</body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  const payload = verifyToken(token);
  if (!payload || payload.purpose !== 'unsubscribe' || !payload.destination) {
    return page('<h1>Link expired</h1><p>This unsubscribe link is invalid or has expired. Contact support to be removed.</p>');
  }
  return page(`<h1>Unsubscribe</h1>
<p>Click below to stop receiving marketing messages at <strong>${payload.destination}</strong>.</p>
<form method="POST">
  <input type="hidden" name="token" value="${token}" />
  <button type="submit" style="background:#b91c1c;color:#fff;border:0;padding:10px 16px;border-radius:8px;font-size:15px;cursor:pointer">Unsubscribe me</button>
</form>`);
}

export async function POST(req: NextRequest) {
  let token = '';
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const form = await req.formData();
    token = String(form.get('token') || '');
  } else {
    token = req.nextUrl.searchParams.get('token') || '';
  }

  const payload = verifyToken(token);
  if (!payload || payload.purpose !== 'unsubscribe' || !payload.destination || !payload.channel) {
    return page('<h1>Link expired</h1><p>This unsubscribe link is invalid or has expired.</p>');
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  await recordOptOut(payload.channel as Channel, payload.destination, {
    restaurantId: payload.restaurantId,
    source: 'unsubscribe_link',
    ipAddress: ip,
    userAgent: req.headers.get('user-agent')
  });

  return page(`<h1>You're unsubscribed</h1>
<p><strong>${payload.destination}</strong> will no longer receive marketing messages. You may still receive essential account and payment notices.</p>`);
}

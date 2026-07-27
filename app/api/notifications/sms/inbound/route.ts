// Build 11.0.1 — inbound SMS webhook (Twilio-compatible).
// Honors STOP/START/HELP keywords per CTIA guidelines. Twilio itself also
// enforces STOP at the carrier level; we mirror it so our own consent records
// and suppression logic stay authoritative and auditable.

import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { classifyInboundSms } from '@/lib/smsKeywords';
import { recordOptOut, recordOptIn } from '@/lib/consent';
import { companyName } from '@/lib/notifications/templates';

// TwiML response so Twilio speaks a confirmation back to the sender.
function twiml(message?: string): NextResponse {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new NextResponse(body, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' }
  });
}

// Validate Twilio's X-Twilio-Signature when an auth token is configured.
function validateTwilioSignature(req: NextRequest, params: Record<string, string>, url: string): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return true; // no token configured (dev) → skip validation
  const signature = req.headers.get('x-twilio-signature');
  if (!signature) return false;
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) data += key + params[key];
  const expected = createHmac('sha1', token).update(Buffer.from(data, 'utf-8')).digest('base64');
  return signature === expected;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    params[key] = String(value);
  });

  const url = process.env.TWILIO_INBOUND_WEBHOOK_URL || req.nextUrl.href;
  if (!validateTwilioSignature(req, params, url)) {
    return new NextResponse('invalid signature', { status: 403 });
  }

  const from = params.From || '';
  const body = params.Body || '';
  const keyword = classifyInboundSms(body);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;

  if (keyword === 'STOP') {
    await recordOptOut('SMS', from, { source: 'sms_STOP', ipAddress: ip });
    return twiml(`${companyName()}: You have been unsubscribed and will receive no further marketing messages. Reply START to re-subscribe.`);
  }
  if (keyword === 'START') {
    await recordOptIn('SMS', from, {
      source: 'sms_START',
      consentText: 'Re-subscribed via SMS START keyword',
      ipAddress: ip
    });
    return twiml(`${companyName()}: You are re-subscribed to messages. Reply STOP to opt out at any time. Msg & data rates may apply.`);
  }
  if (keyword === 'HELP') {
    return twiml(`${companyName()} support: ${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@smokehousecontrol.com'}. Reply STOP to opt out. Msg & data rates may apply.`);
  }

  // Non-keyword inbound messages are acknowledged silently.
  return twiml();
}

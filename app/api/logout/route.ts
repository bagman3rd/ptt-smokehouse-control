import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/rateLimit';

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
  return `${proto}://${host}`;
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'api:logout', 80, 60_000);
  if (limited) return limited;
  clearSessionCookie();
  return NextResponse.redirect(`${getBaseUrl(request)}/login`, 303);
}

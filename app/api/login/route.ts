import { NextResponse } from 'next/server';
import { setSessionCookie } from '@/lib/auth';

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
  return `${proto}://${host}`;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get('password') || '');
  const expected = process.env.ADMIN_PASSWORD || 'admin';
  const baseUrl = getBaseUrl(request);

  if (password !== expected) {
    return NextResponse.redirect(`${baseUrl}/login?error=1`, 303);
  }

  setSessionCookie();
  return NextResponse.redirect(`${baseUrl}/dashboard`, 303);
}

import { NextResponse } from 'next/server';
import { authConfigErrors, setSessionCookie, validatePassword } from '@/lib/auth';

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
  return `${proto}://${host}`;
}

export async function POST(request: Request) {
  const baseUrl = getBaseUrl(request);
  const configErrors = authConfigErrors();
  if (configErrors.length > 0) {
    return NextResponse.redirect(`${baseUrl}/login?config=1`, 303);
  }

  const form = await request.formData();
  const password = String(form.get('password') || '');

  if (!validatePassword(password)) {
    return NextResponse.redirect(`${baseUrl}/login?error=1`, 303);
  }

  setSessionCookie();
  return NextResponse.redirect(`${baseUrl}/dashboard`, 303);
}

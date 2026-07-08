import { NextResponse } from 'next/server';
import { setSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get('password') || '');
  const expected = process.env.ADMIN_PASSWORD || 'admin';
  if (password !== expected) return NextResponse.redirect(new URL('/login?error=1', request.url), 303);
  setSessionCookie();
  return NextResponse.redirect(new URL('/dashboard', request.url), 303);
}

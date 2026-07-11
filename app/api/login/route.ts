import { NextResponse } from 'next/server';
import { authConfigErrors, setSessionCookie } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';
import { prisma } from '@/lib/prisma';
import { ensureDefaultData } from '@/lib/bootstrap';

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

  await ensureDefaultData(prisma);
  const form = await request.formData();
  const username = String(form.get('username') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');

  const user = await prisma.user.findFirst({
    where: {
      active: true,
      OR: [{ username }, { email: username }]
    }
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.redirect(`${baseUrl}/login?error=1`, 303);
  }

  setSessionCookie(user.id);
  return NextResponse.redirect(`${baseUrl}/dashboard`, 303);
}

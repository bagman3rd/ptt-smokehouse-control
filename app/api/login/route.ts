import { NextResponse } from 'next/server';
import { authConfigErrors, setSessionCookie } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';
import { prisma } from '@/lib/prisma';
import { ensureDefaultData } from '@/lib/bootstrap';
import { enforceRateLimit } from '@/lib/rateLimit';
import { auditLog } from '@/lib/tenant';
import { loginSchema } from '@/lib/validators';

const MAX_FAILED_LOGINS = 6;
const LOCKOUT_MS = 30 * 60_000;

function getBaseUrl(request: Request) {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
  return `${proto}://${host}`;
}

function requestMeta(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for') || '';
  const ip = forwarded.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown-ip';
  const userAgent = request.headers.get('user-agent') || 'unknown-agent';
  return { ip, userAgent };
}

async function recordFailedLogin(user: any, identifier: string, request: Request, reason: string) {
  const meta = requestMeta(request);
  if (!user) {
    await auditLog({ action: 'LOGIN_FAILURE', entity: 'Auth', actorName: identifier || 'Unknown', afterJson: { reason, identifier, ...meta } });
    return;
  }

  const failedLoginCount = (user.failedLoginCount || 0) + 1;
  const lockedUntil = failedLoginCount >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCKOUT_MS) : null;
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount, lastFailedLoginAt: new Date(), ...(lockedUntil ? { lockedUntil } : {}) }
  });

  await auditLog({
    restaurantId: user.restaurantId || null,
    actorUserId: user.id,
    actorName: user.name || identifier,
    action: lockedUntil ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILURE',
    entity: 'Auth',
    entityId: user.id,
    afterJson: { reason, identifier, failedLoginCount, lockedUntil, ...meta }
  });
}

export async function POST(request: Request) {
  const baseUrl = getBaseUrl(request);
  const form = await request.formData();
  const parsed = loginSchema.safeParse(Object.fromEntries(form.entries()));
  const identifier = parsed.success ? parsed.data.username.trim().toLowerCase() : '';
  const limited = await enforceRateLimit(request, 'login', 8, 15 * 60_000, identifier);
  if (limited) return limited;

  const configErrors = authConfigErrors();
  if (configErrors.length > 0) {
    return NextResponse.redirect(`${baseUrl}/login?config=1`, 303);
  }

  await ensureDefaultData(prisma);
  if (!parsed.success) {
    await auditLog({ action: 'LOGIN_FAILURE', entity: 'Auth', actorName: 'Unknown', afterJson: { reason: 'invalid form', ...requestMeta(request) } });
    return NextResponse.redirect(`${baseUrl}/login?error=1`, 303);
  }
  const password = parsed.data.password;

  const usernameMatch = await prisma.user.findFirst({ where: { active: true, username: identifier } });
  const emailMatches = usernameMatch ? [] : await prisma.user.findMany({ where: { active: true, email: identifier }, take: 2 });
  const user = usernameMatch || (emailMatches.length === 1 ? emailMatches[0] : null);

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    await auditLog({ restaurantId: user.restaurantId || null, actorUserId: user.id, actorName: user.name, action: 'LOGIN_FAILURE_LOCKED', entity: 'Auth', entityId: user.id, afterJson: { identifier, lockedUntil: user.lockedUntil, ...requestMeta(request) } });
    return NextResponse.redirect(`${baseUrl}/login?locked=1`, 303);
  }

  if (!user || !verifyPassword(password, user.passwordHash)) {
    await recordFailedLogin(user, identifier, request, 'bad credentials');
    return NextResponse.redirect(`${baseUrl}/login?error=1`, 303);
  }

  const activeMembership = await prisma.restaurantMembership.findFirst({ where: { userId: user.id, active: true, restaurant: { active: true } } });
  if (!activeMembership) {
    await recordFailedLogin(user, identifier, request, 'no active membership');
    return NextResponse.redirect(`${baseUrl}/login?error=1`, 303);
  }

  const sessionVersion = user.sessionVersion || 1;
  setSessionCookie(user.id, sessionVersion);
  await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, lastFailedLoginAt: null } }).catch(() => null);
  await auditLog({ restaurantId: activeMembership.restaurantId, actorUserId: user.id, actorName: user.name, action: 'LOGIN_SUCCESS', entity: 'Auth', afterJson: { username: user.username, email: user.email, ...requestMeta(request) } });
  return NextResponse.redirect(`${baseUrl}/dashboard`, 303);
}

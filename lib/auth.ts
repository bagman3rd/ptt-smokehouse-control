import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';
import { currentMembershipForUser } from '@/lib/tenant';
import type { User } from '@prisma/client';

const COOKIE_NAME = 'ptt_session';
const MIN_SECRET_LENGTH = 24;
const SESSION_DAYS = 14;

export const APP_ROLES = ['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW'] as const;
export type AppRole = typeof APP_ROLES[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: 'Admin', OWNER: 'Owner', KITCHEN_MANAGER: 'Kitchen Manager', KITCHEN_CREW: 'Kitchen Crew'
};
const ROLE_ORDER: Record<AppRole, number> = { KITCHEN_CREW: 1, KITCHEN_MANAGER: 2, OWNER: 3, ADMIN: 4 };

function configuredSessionToken() {
  const value = process.env.APP_SESSION_TOKEN;
  if (!value || value.trim().length < MIN_SECRET_LENGTH) return null;
  return value;
}
function configuredAdminPassword() {
  const value = process.env.ADMIN_PASSWORD;
  if (!value || value.trim().length < 12) return null;
  return value;
}
export function authConfigErrors() {
  const errors: string[] = [];
  if (!configuredAdminPassword()) errors.push('ADMIN_PASSWORD must be set and at least 12 characters.');
  if (!configuredSessionToken()) errors.push('APP_SESSION_TOKEN must be set and at least 24 characters.');
  return errors;
}
export function isAuthConfigured() { return authConfigErrors().length === 0; }

export function normalizeRole(role: string | null | undefined): AppRole {
  if (role === 'OWNER') return 'OWNER';
  if (role === 'KITCHEN_MANAGER' || role === 'KM') return 'KITCHEN_MANAGER';
  if (role === 'KITCHEN_CREW' || role === 'PITMASTER' || role === 'VIEWER') return 'KITCHEN_CREW';
  return 'KITCHEN_CREW';
}
export function hasRole(user: Pick<User, 'role'> | null | undefined, allowed: AppRole[]) {
  return Boolean(user && allowed.includes(normalizeRole(String(user.role))));
}
export function hasMinimumRole(user: Pick<User, 'role'> | null | undefined, minimum: AppRole) {
  return Boolean(user && ROLE_ORDER[normalizeRole(String(user.role))] >= ROLE_ORDER[minimum]);
}
function sessionHash(sessionId: string) { return createHash('sha256').update(sessionId).digest('hex'); }
function signSession(userId: string, sessionVersion: number, sessionId: string) {
  const secret = configuredSessionToken();
  if (!secret) throw new Error('APP_SESSION_TOKEN is not configured.');
  return createHmac('sha256', secret).update(`${userId}:${sessionVersion}:${sessionId}`).digest('hex');
}
function constantTimeTextEquals(a: string, b: string) {
  const ab = Buffer.from(a); const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
function parseSessionCookie() {
  const raw = cookies().get(COOKIE_NAME)?.value || '';
  const [userId, versionText, sessionId, signature] = raw.split('.');
  const sessionVersion = Number(versionText);
  if (!userId || !sessionId || !signature || !Number.isInteger(sessionVersion) || sessionVersion < 1) return null;
  if (!constantTimeTextEquals(signature, signSession(userId, sessionVersion, sessionId))) return null;
  return { userId, sessionVersion, sessionId };
}

export async function currentUser() {
  const parsed = parseSessionCookie();
  if (!parsed) return null;
  const [user, session] = await Promise.all([
    prisma.user.findFirst({ where: { id: parsed.userId, active: true } }),
    prisma.userSession.findFirst({ where: { userId: parsed.userId, tokenHash: sessionHash(parsed.sessionId), revokedAt: null, expiresAt: { gt: new Date() } } })
  ]);
  if (!user || !session || user.sessionVersion !== parsed.sessionVersion) return null;
  const membership = await currentMembershipForUser(user).catch(() => null);
  if (!membership) return null;
  if (Date.now() - session.lastSeenAt.getTime() > 15 * 60_000) {
    void prisma.userSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => null);
  }
  return { ...user, role: membership.role, restaurantId: membership.restaurantId, sessionId: session.id };
}
export async function isAuthenticated() { return Boolean(await currentUser()); }
export async function requireAuth() { const user = await currentUser(); if (!user) redirect('/login'); return user; }
function privilegedTwoFactorRequired() { return process.env.ENFORCE_PRIVILEGED_2FA !== 'false' && process.env.NODE_ENV === 'production'; }
export async function requireRole(allowed: AppRole[]) {
  const user = await requireAuth();
  if (!hasRole(user, allowed)) redirect('/dashboard?denied=1');
  const role = normalizeRole(String(user.role));
  if (privilegedTwoFactorRequired() && (role === 'ADMIN' || role === 'OWNER') && !user.twoFactorEnabled) redirect('/account/security?required=1');
  return user;
}
export async function requireApiAuth() {
  if (await isAuthenticated()) return null;
  return NextResponse.json({ ok: false, message: 'Unauthorized. Please log in again.' }, { status: 401 });
}
export async function requireApiRole(allowed: AppRole[]) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Unauthorized. Please log in again.' }, { status: 401 });
  if (!hasRole(user, allowed)) return NextResponse.json({ ok: false, message: 'Forbidden for this access level.' }, { status: 403 });
  const role = normalizeRole(String(user.role));
  if (privilegedTwoFactorRequired() && (role === 'ADMIN' || role === 'OWNER') && !user.twoFactorEnabled) return NextResponse.json({ ok: false, message: 'Two-factor authentication is required for privileged access.' }, { status: 403 });
  return null;
}

export async function setSessionCookie(userId: string, sessionVersion = 1, request?: Request) {
  const sessionId = randomUUID().replace(/-/g, '');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60_000);
  const forwarded = request?.headers.get('x-forwarded-for') || '';
  await prisma.userSession.create({ data: {
    userId, tokenHash: sessionHash(sessionId), expiresAt,
    userAgent: request?.headers.get('user-agent')?.slice(0, 500) || null,
    ipAddress: forwarded.split(',')[0]?.trim().slice(0, 100) || request?.headers.get('x-real-ip')?.slice(0, 100) || null
  }});
  cookies().set(COOKIE_NAME, `${userId}.${sessionVersion}.${sessionId}.${signSession(userId, sessionVersion, sessionId)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_DAYS * 24 * 60 * 60
  });
}
export async function clearSessionCookie() {
  const parsed = parseSessionCookie();
  if (parsed) await prisma.userSession.updateMany({ where: { userId: parsed.userId, tokenHash: sessionHash(parsed.sessionId), revokedAt: null }, data: { revokedAt: new Date() } }).catch(() => null);
  cookies().delete(COOKIE_NAME);
}
export async function apiAuthError() { return (await isAuthenticated()) ? null : { ok: false, message: 'Unauthorized. Please log in again.' }; }
export function initialAdminPassword() { return configuredAdminPassword(); }

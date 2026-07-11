import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';
import type { User } from '@prisma/client';

const COOKIE_NAME = 'ptt_session';
const MIN_SECRET_LENGTH = 12;

export const APP_ROLES = ['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW'] as const;
export type AppRole = typeof APP_ROLES[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: 'Admin',
  OWNER: 'Owner',
  KITCHEN_MANAGER: 'Kitchen Manager',
  KITCHEN_CREW: 'Kitchen Crew'
};

const ROLE_ORDER: Record<AppRole, number> = {
  KITCHEN_CREW: 1,
  KITCHEN_MANAGER: 2,
  OWNER: 3,
  ADMIN: 4
};

function configuredSessionToken() {
  const value = process.env.APP_SESSION_TOKEN;
  if (!value || value.trim().length < MIN_SECRET_LENGTH) return null;
  return value;
}

function configuredAdminPassword() {
  const value = process.env.ADMIN_PASSWORD;
  if (!value || value.trim().length < MIN_SECRET_LENGTH) return null;
  return value;
}

export function authConfigErrors() {
  const errors: string[] = [];
  if (!configuredAdminPassword()) errors.push('ADMIN_PASSWORD must be set and at least 12 characters. It is used to create/reset the initial admin account.');
  if (!configuredSessionToken()) errors.push('APP_SESSION_TOKEN must be set and at least 12 characters. There is no default session token.');
  return errors;
}

export function isAuthConfigured() {
  return authConfigErrors().length === 0;
}

function normalizeRole(role: string | null | undefined): AppRole {
  if (role === 'OWNER') return 'OWNER';
  if (role === 'KITCHEN_MANAGER' || role === 'KM') return 'KITCHEN_MANAGER';
  if (role === 'KITCHEN_CREW' || role === 'PITMASTER' || role === 'VIEWER') return 'KITCHEN_CREW';
  return 'ADMIN'; // legacy CONSULTANT maps to full admin access
}

export function hasRole(user: Pick<User, 'role'> | null | undefined, allowed: AppRole[]) {
  if (!user) return false;
  const role = normalizeRole(String(user.role));
  return allowed.includes(role);
}

export function hasMinimumRole(user: Pick<User, 'role'> | null | undefined, minimum: AppRole) {
  if (!user) return false;
  return ROLE_ORDER[normalizeRole(String(user.role))] >= ROLE_ORDER[minimum];
}

function signUserId(userId: string) {
  const secret = configuredSessionToken();
  if (!secret) throw new Error('APP_SESSION_TOKEN is not configured.');
  return createHmac('sha256', secret).update(userId).digest('hex');
}

function constantTimeTextEquals(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function parseSessionCookie() {
  const raw = cookies().get(COOKIE_NAME)?.value || '';
  const [userId, signature] = raw.split('.');
  if (!userId || !signature) return null;
  const expected = signUserId(userId);
  if (!constantTimeTextEquals(signature, expected)) return null;
  return userId;
}

export async function currentUser() {
  const userId = parseSessionCookie();
  if (!userId) return null;
  return prisma.user.findFirst({ where: { id: userId, active: true } });
}

export async function isAuthenticated() {
  return Boolean(await currentUser());
}

export async function requireAuth() {
  const user = await currentUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireRole(allowed: AppRole[]) {
  const user = await requireAuth();
  if (!hasRole(user, allowed)) redirect('/dashboard?denied=1');
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
  return null;
}

export function setSessionCookie(userId: string) {
  const signature = signUserId(userId);
  cookies().set(COOKIE_NAME, `${userId}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 14
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export async function apiAuthError() {
  if (await isAuthenticated()) return null;
  return { ok: false, message: 'Unauthorized. Please log in again.' };
}

export function initialAdminPassword() {
  return configuredAdminPassword();
}

export { normalizeRole };

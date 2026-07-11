import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'ptt_session';
const MIN_SECRET_LENGTH = 12;

function configuredSecret(name: 'ADMIN_PASSWORD' | 'APP_SESSION_TOKEN') {
  const value = process.env[name];
  if (!value || value.trim().length < MIN_SECRET_LENGTH) return null;
  return value;
}

export function authConfigErrors() {
  const errors: string[] = [];
  if (!configuredSecret('ADMIN_PASSWORD')) errors.push('ADMIN_PASSWORD must be set and at least 12 characters. There is no default admin password.');
  if (!configuredSecret('APP_SESSION_TOKEN')) errors.push('APP_SESSION_TOKEN must be set and at least 12 characters. There is no default session token.');
  return errors;
}

export function isAuthConfigured() {
  return authConfigErrors().length === 0;
}

function digest(value: string) {
  return createHash('sha256').update(value).digest();
}

export function constantTimeEquals(a: string, b: string) {
  const da = digest(a);
  const db = digest(b);
  return timingSafeEqual(da, db);
}

export function isAuthenticated() {
  const token = cookies().get(COOKIE_NAME)?.value || '';
  const expected = configuredSecret('APP_SESSION_TOKEN');
  return Boolean(expected && token && constantTimeEquals(token, expected));
}

export function requireAuth() {
  if (!isAuthenticated()) redirect('/login');
}

export function requireApiAuth() {
  if (isAuthenticated()) return null;
  return NextResponse.json({ ok: false, message: 'Unauthorized. Please log in again.' }, { status: 401 });
}

export function validatePassword(password: string) {
  const expected = configuredSecret('ADMIN_PASSWORD');
  if (!expected) return false;
  return constantTimeEquals(password, expected);
}

export function setSessionCookie() {
  const token = configuredSecret('APP_SESSION_TOKEN');
  if (!token) throw new Error('APP_SESSION_TOKEN is not configured.');
  cookies().set(COOKIE_NAME, token, {
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

export function apiAuthError() {
  if (isAuthenticated()) return null;
  return { ok: false, message: 'Unauthorized. Please log in again.' };
}

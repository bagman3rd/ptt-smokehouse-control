import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const COOKIE_NAME = 'ptt_session';

export function isAuthenticated() {
  const token = cookies().get(COOKIE_NAME)?.value;
  return Boolean(token && process.env.APP_SESSION_TOKEN && token === process.env.APP_SESSION_TOKEN);
}

export function requireAuth() {
  if (!isAuthenticated()) redirect('/login');
}

export function setSessionCookie() {
  cookies().set(COOKIE_NAME, process.env.APP_SESSION_TOKEN || 'dev-token', {
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

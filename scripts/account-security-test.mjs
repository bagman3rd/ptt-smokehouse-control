#!/usr/bin/env node
/* Static checks for Build 4.3.3 account lockout and session revocation. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) { return readFileSync(path, 'utf8'); }

const schema = read('prisma/schema.prisma');
assert.ok(schema.includes('model RateLimitBucket'), 'RateLimitBucket model must exist for durable Postgres-backed rate limiting.');
assert.ok(schema.includes('sessionVersion Int'), 'User.sessionVersion must exist for session revocation.');
assert.ok(schema.includes('failedLoginCount Int'), 'User.failedLoginCount must exist for per-user lockout.');
assert.ok(schema.includes('lockedUntil  DateTime?'), 'User.lockedUntil must exist for lockout windows.');

const auth = read('lib/auth.ts');
assert.ok(auth.includes('signSession(userId: string, sessionVersion: number, sessionId: string)'), 'Session signature must include sessionVersion.');
assert.ok(auth.includes('sessionVersion') && auth.includes('parsed.sessionVersion'), 'currentUser must validate sessionVersion.');

const login = read('app/api/login/route.ts');
assert.ok(login.includes('MAX_FAILED_LOGINS'), 'Login route must define failed-login lockout threshold.');
assert.ok(login.includes('ACCOUNT_LOCKED'), 'Login route must audit account lockouts.');
assert.ok(login.includes('failedLoginCount'), 'Login route must increment failedLoginCount.');
assert.ok(login.includes('lockedUntil'), 'Login route must enforce lockedUntil.');
assert.ok(login.includes("enforceRateLimit(request, 'login'"), 'Login route must remain rate limited.');

const users = read('app/admin/users/actions.ts');
assert.ok(users.includes('sessionVersion: { increment: 1 }'), 'Password reset/deactivation must increment sessionVersion.');
assert.ok(users.includes('RESET_PASSWORD_REVOKE_SESSIONS'), 'Password reset must audit session revocation.');
assert.ok(users.includes('DEACTIVATE_USER_REVOKE_SESSIONS'), 'Deactivation must audit session revocation.');

const rate = read('lib/rateLimit.ts');
assert.ok(rate.includes('rateLimitBucket'), 'Rate limiter must use the RateLimitBucket table.');
assert.ok(rate.includes('upsert'), 'Rate limiter should use durable upsert semantics.');

console.log('Build 7.8.2 account-security checks completed. Durable sessions, lockout, revocation, and sessionVersion signing are present.');

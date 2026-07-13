#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const render=readFileSync('render.yaml','utf8');
const dbHealth=readFileSync('app/api/health/db/route.ts','utf8');
assert.ok(render.includes('TOTP_ENCRYPTION_KEY'));
assert.ok(!dbHealth.includes('error.message'), 'public DB health must not expose raw errors');
assert.ok(readFileSync('lib/auth.ts','utf8').includes("sameSite: 'lax'"));
console.log('Build 7.8.4 static security checks passed.');

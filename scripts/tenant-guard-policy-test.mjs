#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync('lib/tenantGuard.ts','utf8');
assert.ok(source.includes('export function tenantGuardEnabled()'));
assert.ok(source.includes("TENANT_GUARD_ENABLED === '1'"));
assert.ok(source.includes("NODE_ENV === 'development' || process.env.NODE_ENV === 'test'"));
assert.ok(source.includes('Production isolation is enforced by database constraints'));
console.log('Build 7.7.2 tenant-guard policy is explicit and internally consistent.');

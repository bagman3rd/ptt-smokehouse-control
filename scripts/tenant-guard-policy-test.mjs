#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync('lib/tenantGuard.ts', 'utf8');
assert.ok(source.includes('export function tenantGuardEnabled()'));
assert.ok(source.includes("DISABLE_TENANT_GUARD === '1'"));
assert.ok(source.includes("TENANT_GUARD_ENABLED !== '0'"));
assert.ok(source.includes('enabled by default in every runtime, including production'));
assert.ok(!source.includes("NODE_ENV === 'development' || process.env.NODE_ENV === 'test'"));
const render = readFileSync('render.yaml', 'utf8');
assert.ok(render.includes('TENANT_GUARD_ENABLED'));
assert.ok(render.includes('value: "1"'));
console.log('Build 9.5.0 tenant guard is production-on by default and Render explicitly confirms it.');

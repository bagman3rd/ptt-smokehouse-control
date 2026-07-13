#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
const source = fs.readFileSync('app/reports/page.tsx', 'utf8');
assert.match(source, /data-testid="multi-store-rollup"/, 'multi-restaurant rollup section must remain present');
assert.match(source, /memberships:\s*\{\s*some:\s*\{\s*userId:\s*user\.id,\s*active:\s*true/, 'rollup restaurant list must be limited to active memberships for the authenticated user');
assert.match(source, /restaurantId:\s*\{\s*in:\s*rollupIds\s*\}/, 'rollup EOD query must scope records to accessible restaurant IDs');
assert.match(source, /Last 30 days across restaurants this account can access/, 'rollup must clearly state its access boundary');
console.log('Build 9.5.0 multi-restaurant rollup contract passed.');

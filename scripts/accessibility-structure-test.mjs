#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const nav=readFileSync('components/NavMenu.tsx','utf8');
assert.ok(nav.includes('aria-label="Primary navigation"'));
assert.ok(nav.includes('aria-label={`${group.label} menu`}'));
assert.ok(nav.includes('focus:ring-2'));
assert.ok(nav.includes('label className="sr-only"'));
const quick=readFileSync('app/end-of-day/QuickEndOfDayForm.tsx','utf8');
assert.ok(quick.includes('data-testid="submit-quick-eod"'));
assert.ok(quick.includes('<label'));
console.log('Build 7.6.0 structural accessibility checks passed.');

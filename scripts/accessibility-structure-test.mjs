#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const nav = readFileSync('components/NavMenu.tsx', 'utf8');
assert.ok(nav.includes('aria-label="Primary navigation"'));
assert.ok(nav.includes('aria-label={`${group.label} menu`}'));
assert.ok(nav.includes('aria-haspopup="menu"'));
assert.ok(nav.includes('aria-expanded={isOpen}'));
assert.ok(nav.includes('aria-controls={`nav-menu-panel-${groupSlug}`}'));
assert.ok(nav.includes('focus:ring-2'));
assert.ok(nav.includes('label className="sr-only"'));
const quick = readFileSync('app/end-of-day/QuickEndOfDayForm.tsx', 'utf8');
assert.ok(quick.includes('data-testid="submit-quick-eod"'));
assert.ok(quick.includes('<label'));
const plan = readFileSync('docs/DETAILED_TESTING_PLAN.md', 'utf8');
assert.ok(plan.includes('Every visible place where a user can click'));
assert.ok(plan.includes('Release gate'));
console.log('Build 7.8.0 structural accessibility and interaction-plan checks passed.');

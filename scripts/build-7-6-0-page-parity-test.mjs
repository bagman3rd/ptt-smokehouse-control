#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const expectedPages = [
  'app/page.tsx','app/today/page.tsx','app/dashboard/page.tsx','app/cook-plan/page.tsx','app/cook-plan/print/page.tsx',
  'app/end-of-day/page.tsx','app/sales/page.tsx','app/reports/page.tsx','app/learning/page.tsx','app/learning/proof/page.tsx',
  'app/settings/page.tsx','app/billing/page.tsx','app/support/page.tsx','app/help/page.tsx','app/account/security/page.tsx',
  'app/admin/restaurants/page.tsx','app/admin/restaurants/setup/page.tsx','app/admin/restaurants/pos/page.tsx',
  'app/admin/smokers/page.tsx','app/admin/smokers/catalog/page.tsx','app/admin/smokers/schedule/page.tsx',
  'app/admin/users/page.tsx','app/admin/audit/page.tsx','app/admin/data/page.tsx','app/admin/system/page.tsx',
  'app/demo/page.tsx','app/tour/page.tsx','app/signup/page.tsx','app/login/page.tsx','app/privacy/page.tsx','app/terms/page.tsx'
];
for (const page of expectedPages) assert.ok(existsSync(page), `Missing clean-baseline page: ${page}`);

const nav = readFileSync('components/Nav.tsx','utf8');
for (const href of ['/dashboard','/cook-plan','/end-of-day','/admin/smokers/schedule','/reports','/learning','/learning/proof','/tour','/settings','/admin/users','/admin/restaurants','/admin/restaurants/pos','/admin/smokers','/admin/smokers/catalog','/admin/audit','/admin/system','/billing','/admin/data','/support','/help','/demo','/account/security']) {
  assert.ok(nav.includes(`'${href}'`), `Navigation missing ${href}`);
}

const auth = readFileSync('lib/auth.ts','utf8');
for (const legacy of ['ADMINISTRATOR','SUPER_ADMIN','MANAGER','CREW']) assert.ok(auth.includes(legacy), `Legacy role mapping missing ${legacy}`);
assert.ok(auth.includes("toUpperCase()"), 'Role normalization must be case-insensitive');
assert.ok(auth.includes("return 'KITCHEN_CREW'"), 'Unknown roles must fail closed');

console.log('Build 9.3.0 full page, navigation, and legacy-role parity checks passed.');

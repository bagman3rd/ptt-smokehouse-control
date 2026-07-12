#!/usr/bin/env node
import fs from 'node:fs';

const requiredScripts = [
  'test:tenant',
  'test:cross-tenant',
  'test:forecast',
  'test:backup',
  'test:permissions',
  'ci:schema-drift',
  'migration:status'
];

const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
const missing = requiredScripts.filter((name) => !pkg.scripts?.[name]);
if (missing.length) {
  throw new Error(`Missing staging verification scripts: ${missing.join(', ')}`);
}
const renderBuild = pkg.scripts?.['render-build'] || '';
if (!renderBuild.includes('prisma migrate deploy')) throw new Error('render-build must use prisma migrate deploy.');
if (renderBuild.includes('prisma db push')) throw new Error('render-build must not use prisma db push.');
if (renderBuild.includes('--accept-data-loss')) throw new Error('render-build must not use --accept-data-loss.');
if (!fs.existsSync('STAGING_VERIFICATION_BUILD_4_6_0.md')) throw new Error('Missing Build 4.6.0 staging verification doc.');
if (!fs.existsSync('DATABASE_INTEGRITY_RUNBOOK_BUILD_4_6_0.md')) throw new Error('Missing Build 4.6.0 database integrity runbook.');
console.log('Build 4.6.0 staging verification checks completed.');

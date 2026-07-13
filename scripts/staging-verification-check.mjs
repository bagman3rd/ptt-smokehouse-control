#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
for (const name of ['test:tenant','test:cross-tenant','test:forecast','test:restore-drill','test:e2e:ci','ci:schema-drift','ci:migration-status']) assert.ok(pkg.scripts?.[name], `Missing staging verification script: ${name}`);
const renderBuild=pkg.scripts['render-build']||'';
assert.match(renderBuild,/prisma migrate deploy/);
assert.doesNotMatch(renderBuild,/prisma db push|accept-data-loss/);
for (const file of ['docs/DETAILED_TESTING_PLAN.md','docs/INCIDENT_RESPONSE.md','docs/MIGRATION_HISTORY.md','docs/RELEASE_GATE_9_8_0.md']) assert.ok(fs.existsSync(file), `Missing current staging/release document: ${file}`);
const workflow=fs.readFileSync('.github/workflows/ci.yml','utf8');
assert.match(workflow,/pnpm run test:e2e:ci/);
assert.match(workflow,/pnpm run test:restore-drill/);
console.log('Build 9.8.0 staging verification checks passed.');

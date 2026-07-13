#!/usr/bin/env node
import fs from 'node:fs'; import assert from 'node:assert/strict';
const ci=fs.readFileSync('.github/workflows/ci.yml','utf8');
const release=fs.readFileSync('.github/workflows/release.yml','utf8');
assert.match(ci,/pnpm run test:e2e:ci/,'CI must execute entire Playwright directory');
assert.match(ci,/pnpm run test:restore-drill/,'restore drill must be mandatory');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8')); assert.match(pkg.scripts['ci:test'],/test:interaction-manifest/,'manifest must be checked in mandatory CI');
assert.match(release,/workflow_run:/); assert.match(release,/conclusion == 'success'/); assert.match(release,/github\.event\.workflow_run\.head_sha/); assert.match(release,/RELEASE_EVIDENCE\.json/);
console.log('Build 9.8.0 CI and release contracts passed.');

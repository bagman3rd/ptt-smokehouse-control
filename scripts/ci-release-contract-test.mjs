#!/usr/bin/env node
import fs from 'node:fs'; import assert from 'node:assert/strict';
const ci=fs.readFileSync('.github/workflows/ci.yml','utf8');
const release=fs.readFileSync('.github/workflows/release.yml','utf8');
assert.match(ci,/pnpm run test:e2e:ci/,'CI must execute entire Playwright directory');
assert.match(ci,/pnpm run test:restore-drill/,'restore drill must be mandatory');
// Build 11.0.4 — the dedicated build gate must exist and must run next build,
// tsc, and the static guards, so compile errors are caught before Render.
assert.match(ci,/build-gate:/,'CI must define a standalone build-gate job');
assert.match(ci,/needs: build-gate/,'quality-and-tests must require build-gate to pass first');
assert.match(ci,/pnpm run build/,'build-gate must run next build');
assert.match(ci,/pnpm run typecheck/,'build-gate must run tsc --noEmit');
assert.match(ci,/pnpm run test:imports/,'CI must run the import-resolution guard');
assert.match(ci,/pnpm run test:ts-antipatterns/,'CI must run the TS anti-pattern guard');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8')); assert.match(pkg.scripts['ci:test'],/test:interaction-manifest/,'manifest must be checked in mandatory CI');
assert.match(release,/workflow_run:/); assert.match(release,/conclusion == 'success'/); assert.match(release,/github\.event\.workflow_run\.head_sha/); assert.match(release,/RELEASE_EVIDENCE\.json/);
console.log('Build 11.0.4 CI and release contracts passed.');

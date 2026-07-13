#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const [major, minor] = process.versions.node.split('.').map(Number);
const supported = major >= 24 || (major === 22 && minor >= 13) || (major === 20 && minor >= 19);
assert.ok(supported, `Node ${process.versions.node} is outside the supported runtime range. Use Node 20.19+ or Node 22.x (project pin: 22.16.0).`);

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
assert.equal(pkg.engines?.node, '>=20.19.0 <23', 'package.json must support Node 20.19+ and Node 22.x.');
assert.equal(fs.readFileSync('.node-version', 'utf8').trim(), '22.16.0');
assert.equal(fs.readFileSync('.nvmrc', 'utf8').trim(), '22.16.0');
const workflow = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
assert.ok(workflow.includes('node-version: 22.16.0'), 'CI must use Node 22.16.0.');
const lock = fs.readFileSync('pnpm-lock.yaml', 'utf8');
assert.ok(lock.includes("engines: {node: ^20.19.0 || ^22.13.0 || >=24}"), 'Expected locked dependency engine requirement was not found; review this check when dependencies change.');
console.log(`Node ${process.versions.node} satisfies the committed lockfile engine requirements.`);

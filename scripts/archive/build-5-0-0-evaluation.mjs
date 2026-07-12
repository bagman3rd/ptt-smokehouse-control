#!/usr/bin/env node
import fs from 'node:fs';
function assert(condition, message) { if (!condition) throw new Error(message); }
function read(path) { return fs.readFileSync(path, 'utf8'); }
const pkg = JSON.parse(read('package.json'));
const nav = read('components/Nav.tsx');
const learning = read('app/learning/page.tsx');
const proof = read('app/learning/proof/page.tsx');
const proofLib = read('lib/forecastProof.ts');
assert(pkg.version === '5.0.0', 'package.json version must be 5.0.0');
assert(nav.includes('Build 5.0.0'), 'Nav badge must show Build 5.0.0');
assert(nav.includes('/learning/proof'), 'Nav must include Forecast Proof link');
assert(read('README.md').includes('Build 5.0.0'), 'README must reference Build 5.0.0');
assert((pkg.scripts['render-build'] || '').includes('prisma migrate deploy'), 'render-build must use migrate deploy');
assert(!(pkg.scripts['render-build'] || '').includes('prisma db push'), 'render-build must not use prisma db push');
assert(!(pkg.scripts['render-build'] || '').includes('--accept-data-loss'), 'render-build must not use --accept-data-loss');
assert(fs.existsSync('lib/forecastProof.ts'), 'forecast proof library missing');
assert(fs.existsSync('app/learning/proof/page.tsx'), 'Forecast Proof page missing');
assert(proof.includes('30-day MAPE'), 'Forecast Proof must display trailing MAPE');
assert(proof.includes('Forecast vs Actual Detail'), 'Forecast Proof must include row-level forecast-vs-actual detail');
assert(proof.includes('60–90 days of live PTT data'), 'Forecast Proof must state live-data proof requirement');
assert(proofLib.includes('buildForecastProofPoints'), 'forecast proof points helper missing');
assert(proofLib.includes('summarizeForecastProof'), 'forecast proof summary helper missing');
assert(learning.includes('/learning/proof'), 'Learning page must link to Forecast Proof');
assert(fs.existsSync('FORECAST_PROOF_BUILD_5_0_0.md'), 'forecast proof notes missing');
assert(fs.existsSync('TEST_REPORT_BUILD_5_0_0.md'), 'test report missing');
console.log('Build 5.0.0 evaluation checks completed.');

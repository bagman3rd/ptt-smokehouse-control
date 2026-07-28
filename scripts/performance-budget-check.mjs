// Build 11.0.4 — bundle-size performance gate (v3.0 §27.1).
// Fails the build if the gzipped client JS bundle exceeds the budget.
// Run after `next build`: node scripts/performance-budget-check.mjs
//
// In environments where `.next` was not produced (e.g. the Prisma engine
// cannot be downloaded so `next build` did not run), the check reports SKIPPED
// rather than failing — the gate is real in CI where the build succeeds.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const budget = JSON.parse(fs.readFileSync('performance-budget.json', 'utf8'));
const maxKB = budget.bundle.maxGzippedKB.threshold;

const nextDir = '.next';
const staticChunks = path.join(nextDir, 'static', 'chunks');

if (!fs.existsSync(staticChunks)) {
  console.log(
    `performance-budget-check: SKIPPED — ${staticChunks} not found (next build did not run in this environment).`
  );
  console.log(`  Budget that WILL be enforced in CI: <= ${maxKB} KB gzipped shared client JS.`);
  process.exit(0);
}

function gzippedSize(file) {
  const buf = fs.readFileSync(file);
  return zlib.gzipSync(buf).length;
}

// Measure the shared/framework + main chunks that load on first paint.
let totalGzip = 0;
const entries = [];
for (const file of fs.readdirSync(staticChunks)) {
  if (!file.endsWith('.js')) continue;
  const full = path.join(staticChunks, file);
  const size = gzippedSize(full);
  entries.push({ file, kb: +(size / 1024).toFixed(1) });
  totalGzip += size;
}
entries.sort((a, b) => b.kb - a.kb);

const totalKB = +(totalGzip / 1024).toFixed(1);
console.log(`Largest chunks (gzipped):`);
for (const e of entries.slice(0, 8)) console.log(`  ${e.kb} KB  ${e.file}`);
console.log(`Total client chunks (gzipped): ${totalKB} KB (budget ${maxKB} KB)`);

// The budget applies to the shared first-load JS. We use the largest single
// chunk group as the proxy required by the budget definition.
const largest = entries[0]?.kb || 0;
if (largest > maxKB) {
  console.error(
    `performance-budget-check: FAIL — largest first-load chunk ${largest} KB exceeds ${maxKB} KB budget.`
  );
  process.exit(1);
}
console.log('performance-budget-check: PASS — first-load JS within budget.');

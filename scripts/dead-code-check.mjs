#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE_ROOTS = ['app', 'lib', 'components'];

function files(dir, acc = []) {
  for (const item of readdirSync(dir)) {
    if (['node_modules', '.next', '.git'].includes(item)) continue;
    const path = join(dir, item);
    const st = statSync(path);
    if (st.isDirectory()) files(path, acc);
    else if (/\.(ts|tsx|mjs|js)$/.test(path)) acc.push(path);
  }
  return acc;
}

const corpus = SOURCE_ROOTS.flatMap((root) => files(root)).map((p) => [p, readFileSync(p, 'utf8')]);
const all = corpus.map(([, s]) => s).join('\n');
for (const symbol of ['tenantWhere', 'tenantOrLegacyWhere', 'createCookPlan', 'saveEndOfDayLog']) {
  assert.ok(!all.includes(symbol), `${symbol} should not remain in application source.`);
}

console.log('Dead-code check completed. Removed legacy tenant helpers and disabled server-action stubs.');

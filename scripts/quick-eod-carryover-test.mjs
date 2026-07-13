import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync('app/api/end-of-day/route.ts', 'utf8');
const domain = fs.readFileSync('lib/domainCodes.ts', 'utf8');
const status = fs.readFileSync('app/api/eod-status/route.ts', 'utf8');

assert.match(domain, /inferCoreProteinCode/);
assert.match(domain, /includes\('pork'\).*includes\('butt'\)/s);
assert.match(domain, /includes\('chicken'\).*includes\('breast'\)/s);
assert.match(api, /inferCoreProteinCode\(protein\.code, protein\.name\)/);
assert.match(api, /PROTEIN_CODE\.PORK.*PROTEIN_CODE\.CHICKEN.*PROTEIN_CODE\.RIBS/s);
assert.match(api, /\? sealedUnopenedUnits : 0/);
assert.match(status, /sealedUnopenedUnits === 0/);
assert.match(status, /openedMeatLb === 0/);

console.log('Build 7.2.3 Quick EOD carryover regression checks passed.');

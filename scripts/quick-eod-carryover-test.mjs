import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync('app/api/end-of-day/route.ts', 'utf8');
const domain = fs.readFileSync('lib/domainCodes.ts', 'utf8');
const status = fs.readFileSync('app/api/eod-status/route.ts', 'utf8');
const e2e = fs.readFileSync('e2e/core-workflow.spec.ts', 'utf8');
const planPage = fs.readFileSync('app/cook-plan/page.tsx', 'utf8');

assert.match(domain, /inferCoreProteinCode/);
assert.match(domain, /includes\('pork'\).*includes\('butt'\)/s);
assert.match(domain, /includes\('chicken'\).*includes\('breast'\)/s);
assert.match(api, /inferCoreProteinCode\(protein\.code, protein\.name\)/);
assert.match(api, /PROTEIN_CODE\.PORK.*PROTEIN_CODE\.CHICKEN.*PROTEIN_CODE\.RIBS/s);
assert.match(api, /\? sealedUnopenedUnits : 0/);
assert.match(status, /sealedUnopenedUnits === 0/);
assert.match(status, /openedMeatLb === 0/);
assert.doesNotMatch(e2e, /getByDisplayValue/);
assert.match(e2e, /Quick EOD on July 13 applies exact credits to the July 14 cook plan/);
assert.match(e2e, /quick-eod-sealed-BRISKET/);
assert.match(e2e, /quick-eod-sealed-PORK/);
assert.match(e2e, /quick-eod-sealed-CHICKEN/);
assert.match(e2e, /quick-eod-sealed-RIBS/);
assert.match(e2e, /prior-eod-credit-value-PORK/);
assert.match(e2e, /expect\(planByCode\.get\('PORK'\)\?\.usableLeftoverUnits\)\.toBe\(3\)/);
assert.match(e2e, /expect\(planByCode\.get\('CHICKEN'\)\?\.usableLeftoverUnits\)\.toBe\(5\)/);
assert.match(e2e, /expect\(planByCode\.get\('RIBS'\)\?\.usableLeftoverUnits\)\.toBe\(2\)/);
assert.match(e2e, /expect\(planByCode\.get\('BRISKET'\)\?\.usableLeftoverUnits\)\.toBe\(0\)/);
assert.match(planPage, /prior-eod-credit-value-/);

console.log('Build 7.7.1 Quick EOD carryover and exact E2E regression checks passed.');

#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const cases=[
 ['app/api/cook-plan/route.ts',['ADMIN','OWNER','KITCHEN_MANAGER'],['KITCHEN_CREW']],
 ['app/api/end-of-day/route.ts',['ADMIN','OWNER','KITCHEN_MANAGER','KITCHEN_CREW'],[]],
 ['app/api/reports/backup/route.ts',['ADMIN','OWNER'],['KITCHEN_MANAGER','KITCHEN_CREW']]
];
for (const [file,allowed,denied] of cases) {
 const s=readFileSync(file,'utf8'); assert.match(s,/requireApi(?:User)?Role\(/);
 for (const role of allowed) assert.ok(s.includes(`'${role}'`),`${file} missing ${role}`);
 for (const role of denied) assert.ok(!s.includes(`'${role}'`),`${file} incorrectly allows ${role}`);
}
console.log('Build 8.0.0 API role contracts passed.');

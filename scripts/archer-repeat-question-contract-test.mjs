import fs from 'node:fs';
import assert from 'node:assert/strict';
const api = fs.readFileSync('app/api/archer/route.ts', 'utf8');
const ui = fs.readFileSync('components/ArcherChat.tsx', 'utf8');
assert.match(api, /content: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(2400\)/, 'history must accept the complete Archer answer');
assert.match(ui, /message\.content\.slice\(0, 2400\)/, 'client must cap history to the API contract');
assert.match(ui, /requestSequenceRef/, 'repeat submissions must use a stable request lifecycle');
assert.match(api, /could not continue the conversation history/, 'history validation must not blame the new question');
console.log('Build 9.8.0 Archer repeat-question contract passed.');

import fs from 'node:fs';
const shell=fs.readFileSync('components/Shell.tsx','utf8');
const ui=fs.readFileSync('components/ArcherChat.tsx','utf8');
const api=fs.readFileSync('app/api/archer/route.ts','utf8');
const kb=fs.readFileSync('lib/archerKnowledge.ts','utf8');
const checks=[
 ['Shell renders ArcherChat', shell.includes('<ArcherChat />')],
 ['lower-right launcher exists', ui.includes('archer-launcher')],
 ['500 character limit', ui.includes('maxLength={500}') && api.includes('max(500)')],
 ['authenticated API', api.includes('currentUser()')],
 ['rate limiting', api.includes('enforceRateLimit')],
 ['OpenAI Responses endpoint', api.includes('/v1/responses')],
 ['response storage disabled', api.includes('store: false')],
 ['built-in fallback', api.includes('localArcherAnswer')],
 ['privacy rule', kb.includes('Never reveal secrets')]
];
const failed=checks.filter(([,ok])=>!ok); for(const [n,ok] of checks) console.log(`${ok?'PASS':'FAIL'} ${n}`); if(failed.length) process.exit(1);

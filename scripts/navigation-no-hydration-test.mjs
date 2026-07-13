import fs from 'node:fs';

const source = fs.readFileSync('components/NavMenu.tsx', 'utf8');
const nav = fs.readFileSync('components/Nav.tsx', 'utf8');
const fail = (message) => { console.error(message); process.exit(1); };

if (/['\"]use client['\"]/.test(source)) fail('NavMenu must not depend on client hydration.');
for (const label of ['Operations', 'Insights', 'Admin', 'Help']) {
  if (!source.includes(label) && !nav.includes(`label: '${label}'`)) fail(`Missing navigation group: ${label}`);
}
if (source.includes('<details') || source.includes('<summary')) fail('Build 7.5.1 navigation must use direct links, not interactive dropdowns.');
if (!source.includes('action="/api/logout"')) fail('Logout must remain a native POST form.');
if (!source.includes('href="/today"')) fail('Today must remain a standard link.');
if (!source.includes('<Link')) fail('Navigation entries must be server-rendered links.');
console.log('Build 7.5.1 direct-link navigation checks passed.');

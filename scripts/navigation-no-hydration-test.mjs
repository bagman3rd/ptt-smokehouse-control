import fs from 'node:fs';

const source = fs.readFileSync('components/NavMenu.tsx', 'utf8');
const fail = (message) => { console.error(message); process.exit(1); };

if (/['\"]use client['\"]/.test(source)) fail('NavMenu must not depend on client hydration.');
for (const label of ['Operations', 'Insights', 'Admin', 'Help']) {
  if (!source.includes(label) && !fs.readFileSync('components/Nav.tsx', 'utf8').includes(`label: '${label}'`)) {
    fail(`Missing navigation group: ${label}`);
  }
}
if (!source.includes('<details')) fail('Navigation groups must use native <details> controls.');
if (!source.includes('<summary')) fail('Navigation groups must use native <summary> controls.');
if (!source.includes('action="/api/logout"')) fail('Logout must remain a native POST form.');
if (!source.includes('href="/today"')) fail('Today must remain a standard link.');
console.log('Build 7.4.1 hydration-independent navigation checks passed.');

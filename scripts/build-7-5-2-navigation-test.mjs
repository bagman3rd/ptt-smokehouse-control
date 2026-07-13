import fs from 'node:fs';

const nav = fs.readFileSync('components/NavMenu.tsx', 'utf8');
const shell = fs.readFileSync('components/Nav.tsx', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const checks = [
  [pkg.version === '7.5.2', 'package version is 7.5.2'],
  [nav.includes("'use client'"), 'NavMenu is a client component'],
  [nav.includes('useState<string | null>'), 'dropdown state exists'],
  [nav.includes('nav-menu-button-'), 'dropdown buttons have stable test IDs'],
  [nav.includes('aria-expanded={isOpen}'), 'dropdown buttons expose open state'],
  [nav.includes("event.key === 'Escape'"), 'Escape closes menus'],
  [nav.includes("document.addEventListener('mousedown'"), 'outside click closes menus'],
  [nav.includes("document.addEventListener('touchstart'"), 'outside touch closes menus'],
  [!nav.includes('DirectGroup'), 'expanded always-visible link groups were removed'],
  [shell.includes('href="/today"'), 'brand links to Today'],
  [shell.includes('Build 7.5.2'), 'visible build label is current']
];

for (const [ok, message] of checks) {
  if (!ok) throw new Error(`FAIL: ${message}`);
  console.log(`PASS: ${message}`);
}

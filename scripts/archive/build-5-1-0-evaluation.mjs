#!/usr/bin/env node
import fs from 'node:fs';
function assert(condition, message) { if (!condition) throw new Error(message); }
function read(path) { return fs.readFileSync(path, 'utf8'); }
const pkg = JSON.parse(read('package.json'));
const nav = read('components/Nav.tsx');
const today = read('app/today/page.tsx');
const print = read('app/cook-plan/print/page.tsx');
const schedulePage = read('app/admin/smokers/schedule/page.tsx');
const scheduleLib = read('lib/smokerSchedule.ts');
assert(pkg.version === '5.1.0', 'package.json version must be 5.1.0');
assert(nav.includes('Build 5.1.0'), 'Nav badge must show Build 5.1.0');
assert(nav.includes('/admin/smokers/schedule'), 'Nav must include smoker schedule link');
assert(read('README.md').includes('Build 5.1.0'), 'README must reference Build 5.1.0');
assert((pkg.scripts['render-build'] || '').includes('prisma migrate deploy'), 'render-build must use migrate deploy');
assert(!(pkg.scripts['render-build'] || '').includes('prisma db push'), 'render-build must not use prisma db push');
assert(!(pkg.scripts['render-build'] || '').includes('--accept-data-loss'), 'render-build must not use --accept-data-loss');
assert(fs.existsSync('lib/smokerSchedule.ts'), 'smoker schedule library missing');
assert(fs.existsSync('app/admin/smokers/schedule/page.tsx'), 'smoker schedule page missing');
assert(scheduleLib.includes('buildSmokerLoadSchedule'), 'buildSmokerLoadSchedule helper missing');
assert(scheduleLib.includes('scheduleWarnings'), 'scheduleWarnings helper missing');
assert(schedulePage.includes('Production Schedule'), 'schedule page must show production schedule');
assert(schedulePage.includes('Active Smoker Matrix'), 'schedule page must show smoker matrix');
assert(today.includes('buildSmokerLoadSchedule'), 'Today page must use smoker scheduling library');
assert(today.includes('Full Schedule'), 'Today page must link to full smoker schedule');
assert(print.includes('Smoker Schedule'), 'Print view must include smoker schedule');
assert(fs.existsSync('SMOKER_SCHEDULING_BUILD_5_1_0.md'), 'smoker scheduling notes missing');
assert(fs.existsSync('TEST_REPORT_BUILD_5_1_0.md'), 'test report missing');
console.log('Build 5.1.0 evaluation checks completed.');

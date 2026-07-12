#!/usr/bin/env node
import fs from 'node:fs';
function assert(condition, message) { if (!condition) throw new Error(message); }
function read(path) { return fs.readFileSync(path, 'utf8'); }
const pkg = JSON.parse(read('package.json'));
const nav = read('components/Nav.tsx');
const eod = read('app/end-of-day/EndOfDayForm.tsx');
const today = read('app/today/page.tsx');
const print = read('app/cook-plan/print/page.tsx');
const css = read('app/globals.css');
assert(pkg.version === '4.9.0', 'package.json version must be 4.9.0');
assert(nav.includes('Build 4.9.0'), 'Nav badge must show Build 4.9.0');
assert(read('README.md').includes('Build 4.9.0'), 'README must reference Build 4.9.0');
assert((pkg.scripts['render-build'] || '').includes('prisma migrate deploy'), 'render-build must use migrate deploy');
assert(!(pkg.scripts['render-build'] || '').includes('prisma db push'), 'render-build must not use prisma db push');
assert(!(pkg.scripts['render-build'] || '').includes('--accept-data-loss'), 'render-build must not use --accept-data-loss');
assert(eod.includes('autosaves locally every 5 seconds'), 'EOD form must show autosave guidance');
assert(eod.includes('beforeunload'), 'EOD form must warn before leaving with local draft');
assert(eod.includes('pendingRetryPayload'), 'EOD form must preserve failed submit payload');
assert(eod.includes('Restore Draft'), 'EOD form must include restore draft control');
assert(eod.includes('choose a reason when marking an 86 event'), 'EOD form must require reason for 86 closeout');
assert(today.includes('Kitchen Mode'), 'Today page must include Kitchen Mode toggle');
assert(today.includes('kitchen-mode'), 'Today page must support kitchen mode CSS class');
assert(print.includes('Manager Signoff / Hot Box Verified / Load Count Confirmed'), 'Print view must include pit-friendly signoff');
assert(print.includes('Close the day at /end-of-day'), 'Print view must point crew to EOD closeout');
assert(css.includes('Build 4.9.0 kitchen field usability pass'), 'CSS must include Build 4.9.0 kitchen usability block');
assert(fs.existsSync('KITCHEN_FIELD_USABILITY_BUILD_4_9_0.md'), 'kitchen usability notes missing');
assert(fs.existsSync('TEST_REPORT_BUILD_4_9_0.md'), 'test report missing');
console.log('Build 4.9.0 evaluation checks completed.');

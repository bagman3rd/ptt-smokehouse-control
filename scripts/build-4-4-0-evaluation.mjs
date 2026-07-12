import fs from 'node:fs';
import path from 'node:path';

function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const pkg = JSON.parse(read('package.json'));
assert(pkg.version === '4.4.0', 'package version must be 4.4.0');
assert(read('components/Nav.tsx').includes('Build 4.4.0'), 'nav badge must show Build 4.4.0');
assert(read('app/learning/page.tsx').includes('Trailing 30-Day MAPE'), 'Learning must show trailing 30-day MAPE');
assert(read('app/end-of-day/EndOfDayForm.tsx').includes('localStorage'), 'EOD form must include local draft persistence');
assert(read('app/globals.css').includes('@media print'), 'print CSS must exist');
assert(fs.existsSync('app/terms/page.tsx'), 'Terms page missing');
assert(fs.existsSync('app/privacy/page.tsx'), 'Privacy page missing');
assert(fs.existsSync('app/help/page.tsx'), 'Help page missing');
assert(fs.existsSync('app/billing/page.tsx'), 'Billing page missing');
assert(fs.existsSync('app/api/billing/checkout/route.ts'), 'Billing checkout route missing');
assert(read('README.md').includes('Build 4.4.0'), 'README must mention Build 4.4.0');
console.log('Build 4.4.0 evaluation checks completed.');

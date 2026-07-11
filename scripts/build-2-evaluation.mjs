import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(name, condition, detail = '') {
  if (!condition) {
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${name}`);
  }
}

const pkg = JSON.parse(read('package.json'));
assert('package version', pkg.version === '2.3.0', pkg.version);
assert('nav badge', read('components/Nav.tsx').includes('Build 2.3.0'));
assert('learning nav link', read('components/Nav.tsx').includes("['Learning', '/learning']"));
assert('learning page exists', fs.existsSync('app/learning/page.tsx'));
assert('learning compares prior-day proteins', read('app/learning/page.tsx').includes('planDateForProtein'));
assert('learning has recommendations', read('app/learning/page.tsx').includes('recommendationText'));
assert('api cook-plan protected', read('app/api/cook-plan/route.ts').includes('apiAuthError'));
assert('api end-of-day protected', read('app/api/end-of-day/route.ts').includes('apiAuthError'));
assert('api eod-status protected', read('app/api/eod-status/route.ts').includes('apiAuthError'));
assert('settings not overwritten by bootstrap', read('lib/bootstrap.ts').includes('update: {}'));
assert('render build no accept-data-loss', !read('package.json').includes('--accept-data-loss'));

if (process.exitCode) process.exit(process.exitCode);
console.log('Build 2.3.0 evaluation checks completed.');

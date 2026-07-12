import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function assert(condition, message) {
  if (!condition) {
    console.error(`Build 5.4.0 evaluation failed: ${message}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(read('package.json'));
assert(pkg.version === '5.4.0', 'package version must be 5.4.0');
assert(read('components/Nav.tsx').includes('Build 5.4.0'), 'nav badge must show Build 5.4.0');
assert(read('README.md').includes('Build 5.4.0'), 'README must reference Build 5.4.0');
assert(fs.existsSync('app/tour/page.tsx'), '/tour page must exist');
assert(fs.existsSync('app/sales/page.tsx'), '/sales page must exist');
assert(read('app/help/page.tsx').includes('What is a load date?'), 'help docs must explain load date');
assert(read('app/help/page.tsx').includes('How do I import POS sales?'), 'help docs must explain POS import');
assert(read('app/demo/page.tsx').includes('90 days'), 'demo page must reference 90 days');
assert(read('lib/starterData.ts').includes('for (let i = 90; i >= 1; i--)'), 'demo history must create 90 days');
assert(read('app/sales/page.tsx').includes('Reduce BBQ waste'), 'sales package must include waste value prop');
assert(read('app/tour/page.tsx').includes('Daily operating loop'), 'tour must include daily operating loop');
const renderBuild = pkg.scripts['render-build'] || '';
assert(renderBuild.includes('prisma migrate deploy'), 'render-build must use prisma migrate deploy');
assert(!renderBuild.includes('prisma db push'), 'render-build must not use prisma db push');
assert(!JSON.stringify(pkg.scripts).includes('--accept-data-loss'), 'scripts must not include --accept-data-loss');
console.log('Build 5.4.0 evaluation checks completed.');

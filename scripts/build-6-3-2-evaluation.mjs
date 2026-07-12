import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const pkg=JSON.parse(read('package.json'));
const tenant=read('lib/tenant.ts');
const checks=[
  ['package version', pkg.version === '6.3.2'],
  ['tenant audit log skips unscoped events', tenant.includes('if (!args.restaurantId) return;')],
  ['tenant audit log writes non-null restaurant id', tenant.includes('restaurantId: args.restaurantId,')],
  ['tenant audit log no longer writes null restaurant id', !tenant.includes('restaurantId: args.restaurantId || null')],
  ['visible version', read('components/Nav.tsx').includes('Build 6.3.2')],
  ['health version', read('app/api/health/route.ts').includes("build: '6.3.2'")],
];
for (const [name,ok] of checks) { if (!ok) throw new Error(`FAILED: ${name}`); console.log(`PASS: ${name}`); }
console.log('Build 6.3.2 evaluation completed.');

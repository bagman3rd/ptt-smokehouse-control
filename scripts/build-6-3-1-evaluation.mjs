import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const pkg=JSON.parse(read('package.json'));
const route=read('app/api/cook-plan/capacity-preview/route.ts');
const checks=[
 ['package version',pkg.version==='6.3.1'],
 ['protein query has no smoker review field',!route.includes("prisma.protein.findMany({ where: { restaurantId, active: true, configurationReviewedAt")],
 ['smoker query still requires review',route.includes("prisma.smoker.findMany({ where: { restaurantId, active: true, configurationReviewedAt: { not: null } }")],
];
for (const [name,ok] of checks){ if(!ok) throw new Error(`FAILED: ${name}`); console.log(`PASS: ${name}`);}
console.log('Build 6.3.1 evaluation completed.');

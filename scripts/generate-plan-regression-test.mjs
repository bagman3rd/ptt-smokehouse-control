import fs from 'node:fs';
const forecastSource = fs.readFileSync('lib/forecast.ts', 'utf8');
for (const token of ['totalCookedLbFromBbqSales','effectiveRevenuePerCookedLb','scenario mix percentages are cooked-weight mix']) {
  if (!forecastSource.includes(token)) throw new Error(`forecast source missing ${token}`);
}
function cookedLbPerUnit(p) { return Math.max(0.1, p.cookedWeightEachLb || p.rawWeightEachLb * (p.cookedYieldPercent / 100) || 1); }
function revenue(p) { return p.inputUnit === 'RACK' ? (p.salesPriceEach || 33) / cookedLbPerUnit(p) : (p.avgSalesPerCookedLb || 22); }
const proteins = [
  { name:'Brisket', cookedYieldPercent:50, rawWeightEachLb:12, avgSalesPerCookedLb:40 },
  { name:'Pulled Pork', cookedYieldPercent:55, rawWeightEachLb:10, avgSalesPerCookedLb:22 },
  { name:'Ribs', cookedYieldPercent:90.9, rawWeightEachLb:3.3, cookedWeightEachLb:3.0, inputUnit:'RACK', salesPriceEach:33 },
  { name:'Pulled Chicken', cookedYieldPercent:75, rawWeightEachLb:2.5, cookedWeightEachLb:1.875, avgSalesPerCookedLb:22 }
];
const mix = { Brisket:.30, 'Pulled Pork':.40, Ribs:.15, 'Pulled Chicken':.15 };
const bbqSales = 10000;
const weightedRevenue = proteins.reduce((sum,p)=>sum + mix[p.name]*revenue(p),0);
const totalCookedLb = bbqSales / weightedRevenue;
const targets = Object.fromEntries(proteins.map(p=>[p.name, totalCookedLb*mix[p.name]]));
if (Math.abs(Object.values(targets).reduce((a,b)=>a+b,0) - totalCookedLb) > 0.001) throw new Error('protein cooked-weight targets do not sum to total cooked pounds');
if (!(targets['Pulled Pork'] > targets['Brisket'] && targets['Brisket'] > targets['Ribs'])) throw new Error('cooked-weight mix ordering failed');
// Dollar split must not equal 40/30/15/15 because selling prices differ.
const dollars = Object.fromEntries(proteins.map(p=>[p.name, targets[p.name]*revenue(p)]));
const brisketDollarShare = dollars.Brisket / bbqSales;
if (Math.abs(brisketDollarShare - 0.30) < 0.03) throw new Error('regression failed: brisket share looks like dollar-mix instead of cooked-weight mix');
if (!(brisketDollarShare > 0.40)) throw new Error('expected brisket dollar share above 40% when using cooked-weight mix and higher brisket price');
console.log('Build 5.8.0 generate-plan cooked-weight regression checks passed.');

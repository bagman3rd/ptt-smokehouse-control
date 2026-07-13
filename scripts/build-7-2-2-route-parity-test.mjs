import fs from 'node:fs';
import path from 'node:path';
const expected = [
'app/account/security/page.tsx','app/admin/audit/page.tsx','app/admin/data/page.tsx','app/admin/restaurants/page.tsx','app/admin/restaurants/pos/page.tsx','app/admin/restaurants/setup/page.tsx','app/admin/smokers/catalog/page.tsx','app/admin/smokers/page.tsx','app/admin/smokers/schedule/page.tsx','app/admin/system/page.tsx','app/admin/users/page.tsx','app/billing/page.tsx','app/cook-plan/page.tsx','app/cook-plan/print/page.tsx','app/dashboard/page.tsx','app/demo/page.tsx','app/end-of-day/page.tsx','app/help/page.tsx','app/learning/page.tsx','app/learning/proof/page.tsx','app/login/page.tsx','app/page.tsx','app/privacy/page.tsx','app/reports/page.tsx','app/sales/page.tsx','app/settings/page.tsx','app/signup/page.tsx','app/support/page.tsx','app/terms/page.tsx','app/today/page.tsx','app/tour/page.tsx'];
const missing=expected.filter(f=>!fs.existsSync(path.resolve(f)));
if(missing.length) throw new Error(`Missing baseline pages: ${missing.join(', ')}`);
const actual=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.name==='page.tsx')actual.push(p.replaceAll('\\','/'));}}
walk('app');
actual.sort();
if(actual.length!==expected.length) throw new Error(`Expected ${expected.length} pages, found ${actual.length}`);
for (let i=0;i<expected.length;i++) if(actual[i]!==expected[i]) throw new Error(`Route mismatch at ${i}: expected ${expected[i]}, found ${actual[i]}`);
console.log(`Route parity passed: ${actual.length} baseline pages preserved.`);

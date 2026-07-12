import fs from 'node:fs';
const data = fs.readFileSync('lib/smokerCatalogData.ts','utf8');
const modelCount = (data.match(/brand:'/g) || []).length;
const brands = ['Ole Hickory Pits','Southern Pride','J&R Manufacturing','Cookshack','M&M BBQ Company'];
for (const brand of brands) {
  if (!data.includes(`brand:'${brand}'`)) {
    console.error(`Build 5.5.0 smoker catalog test failed: missing ${brand}`);
    process.exit(1);
  }
}
if (modelCount < 50) {
  console.error(`Build 5.5.0 smoker catalog test failed: expected at least 50 catalog rows, found ${modelCount}`);
  process.exit(1);
}
for (const token of ['sourceConfidence','OFFICIAL','RESEARCHED','ESTIMATED','EL-ED/X','SPK-700','Oyler 700','SM360','MM1000']) {
  if (!data.includes(token)) {
    console.error(`Build 5.5.0 smoker catalog test failed: missing ${token}`);
    process.exit(1);
  }
}
console.log(`Build 5.5.0 smoker catalog checks completed with ${modelCount} catalog rows.`);

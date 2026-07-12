import fs from 'node:fs';
const data = fs.readFileSync('lib/smokerCatalogData.ts','utf8');
const modelCount = (data.match(/brand:'/g) || []).length;
const requiredBrands = ['Ole Hickory Pits','Southern Pride','J&R Manufacturing','Cookshack','M&M BBQ Company'];
for (const brand of requiredBrands) {
  if (!data.includes(`brand:'${brand}'`)) throw new Error(`missing ${brand}`);
}
if (modelCount < 45) throw new Error(`expected at least 45 active catalog rows, found ${modelCount}`);
const banned = ['sourceConfidence:\'ESTIMATED\'','capacities estimated','estimated from','wholeChickenToBreasts','breast-equivalent','whole-chicken capacities are reference text'];
for (const token of banned) {
  if (data.includes(token)) throw new Error(`banned catalog language/value found: ${token}`);
}
function rowFor(model) {
  const escaped = model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = data.match(new RegExp(`row\\(\\{[^}]*model:'${escaped}'[^}]*\\}\\)`, 's'));
  if (!match) throw new Error(`missing row for ${model}`);
  return match[0];
}
const spk500 = rowFor('SPK-500');
for (const token of ['rackCount:15','brisketCapacity:20','porkCapacity:60','ribCapacity:60','chickenCapacity:70',"chickenCapacityUnit:'WHOLE_CHICKEN_COUNT'","officialCapacityText:'15 racks; 20 briskets; 60 pork butts; 60 St. Louis ribs; 70 whole chickens'"]) {
  if (!spk500.includes(token)) throw new Error(`SPK-500 fixture failed: ${token}`);
}
const mlr = rowFor('MLR-150');
for (const token of ['rackCount:12','brisketCapacity:8','porkCapacity:24','ribCapacity:24','chickenCapacity:32',"officialCapacityText:'12 racks; 24 pork butts; 24 St. Louis ribs; 32 whole chickens; 8 beef briskets'"]) {
  if (!mlr.includes(token)) throw new Error(`MLR-150 fixture failed: ${token}`);
}
const eledx = rowFor('EL-ED/X');
for (const token of ['rackCount:12','rackWidthIn:18','rackDepthIn:48','cookingAreaSqIn:10368','brisketCapacity:40','porkCapacity:80','ribCapacity:105','chickenCapacity:72']) {
  if (!eledx.includes(token)) throw new Error(`EL-ED/X fixture failed: ${token}`);
}
const sm160 = rowFor('SM160');
for (const token of ['brisketCapacity:null',"brisketCapacityUnit:'LB'",'porkCapacity:null',"porkCapacityUnit:'LB'",'ribCapacity:null',"ribCapacityUnit:'LB'",'chickenCapacity:20',"chickenCapacityUnit:'WHOLE_CHICKEN_COUNT'","officialCapacityText:'120 lb pork butts; 100 lb brisket; 50 lb ribs; 20 whole chickens'"]) {
  if (!sm160.includes(token)) throw new Error(`SM160 pounds-not-counts fixture failed: ${token}`);
}
const jr = rowFor('Little Red Smokehouse 250 FSE');
for (const token of ['brisketCapacity:null',"brisketCapacityUnit:'RANGE'",'ribCapacity:50',"chickenCapacityUnit:'HALF_CHICKEN_COUNT'"]) {
  if (!jr.includes(token)) throw new Error(`J&R 250 FSE fixture failed: ${token}`);
}
for (const model of ['Oyler 700','Oyler 1300','FEC750']) {
  const row = rowFor(model);
  if (!row.includes('brisketCapacity:null') || !row.includes('porkCapacity:null')) throw new Error(`${model} should not load pound capacity as unit counts`);
}
console.log(`Build 5.9.3 smoker catalog regression checks passed with ${modelCount} manufacturer rows.`);

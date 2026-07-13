import fs from 'node:fs';
import assert from 'node:assert/strict';

const actions = fs.readFileSync('app/admin/smokers/actions.ts', 'utf8');
const page = fs.readFileSync('app/admin/smokers/page.tsx', 'utf8');
const forms = fs.readFileSync('components/smokers/SmokerCatalogForms.tsx', 'utf8');

assert.match(actions, /export async function deleteSmoker/);
assert.match(actions, /requireRole\(\['ADMIN', 'OWNER'\]\)/);
assert.match(actions, /findFirst\(\{ where: \{ id, restaurantId \} \}\)/);
assert.match(actions, /deleteMany\(\{ where: \{ id, restaurantId \} \}\)/);
assert.match(actions, /action: 'DELETE'/);
assert.match(actions, /revalidatePath\('\/admin\/smokers\/schedule'\)/);
assert.match(actions, /revalidatePath\('\/today'\)/);
assert.match(page, /deleteSmoker/);
assert.match(page, /deleteAction=\{deleteSmoker\}/);
assert.match(forms, /data-testid=\{`delete-smoker-\$\{smoker\.id\}`\}/);
assert.match(forms, /window\.confirm/);
assert.match(forms, /formAction=\{deleteAction\}/);
assert.match(forms, /formNoValidate/);
console.log('Smoker delete contract passed.');

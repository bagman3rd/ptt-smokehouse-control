import fs from 'fs';
import path from 'path';

const root = process.cwd();
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const pkg = JSON.parse(read('package.json'));
assert(pkg.version === '3.8.1', 'package version must be 3.8.1');
assert(pkg.scripts['build:eval'].includes('build-3-8-1-evaluation'), 'build:eval must use Build 3.8.1 evaluation script');
const schema = read('prisma/schema.prisma');
assert(schema.includes('model SystemCheck'), 'SystemCheck model missing');
assert(schema.includes('systemChecks SystemCheck[]'), 'Restaurant.systemChecks relation missing');
const nav = read('components/Nav.tsx');
assert(nav.includes('Build 3.8.1'), 'Nav badge not updated');
const systemPage = read('app/admin/system/page.tsx');
assert(systemPage.includes('Test Status Tracking'), 'System test-status tracking missing');
assert(systemPage.includes('RESTORE_DRILL'), 'Restore drill tracker missing');
assert(systemPage.includes('Recent Staging / Restore Checks'), 'Recent system checks table missing');
const setupPage = read('app/admin/restaurants/setup/page.tsx');
assert(setupPage.includes('Setup Completion:'), 'Setup completion score missing');
assert(setupPage.includes('Setup warnings'), 'Setup warning block missing');
assert(setupPage.includes('No smoker capacity entered'), 'Setup smoker warning missing');
const posClient = read('app/admin/restaurants/pos/PosImportPreviewForm.tsx');
assert(posClient.includes('Import Preview'), 'POS import preview missing');
assert(posClient.includes('Confirm preview and import'), 'POS import confirmation missing');
const cookPrint = read('app/cook-plan/print/page.tsx');
assert(cookPrint.includes('Smokehouse Daily Load Plan'), 'Printable cook plan missing');
assert(read('app/cook-plan/print/PrintButton.tsx').includes('window.print'), 'Print button missing');
const cookPage = read('app/cook-plan/page.tsx');
assert(cookPage.includes('Print View'), 'Cook Plan print link missing');
const learning = read('app/learning/page.tsx');
assert(learning.includes('Forecast-change impact preview'), 'Learning forecast-change impact preview missing');
const login = read('app/api/login/route.ts');
assert(login.includes('LOGIN_SUCCESS') && login.includes('LOGIN_FAILURE'), 'Login audit logging missing');
const backup = read('app/api/reports/backup/route.ts');
assert(backup.includes('BACKUP_EXPORTED'), 'Backup export audit missing');
const exportRoute = read('app/api/reports/export/route.ts');
assert(exportRoute.includes('REPORT_EXPORTED'), 'Report export audit missing');
const renderBuild = pkg.scripts['render-build'];
assert(renderBuild.includes('prisma db push'), 'Render build should remain in db-push recovery mode');
assert(!renderBuild.includes('--accept-data-loss'), 'Render build must not use --accept-data-loss');
console.log('Build 3.8.1 evaluation checks completed.');

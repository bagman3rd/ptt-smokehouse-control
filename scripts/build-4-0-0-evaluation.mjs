import { readFileSync, existsSync } from 'fs';

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
assert(pkg.version === '4.0.0', 'package.json version should be 4.0.0');
assert(pkg.scripts['render-build'].includes('prisma db push'), 'render-build should remain on db-push recovery mode');
assert(!pkg.scripts['render-build'].includes('--accept-data-loss'), 'render-build must not use --accept-data-loss');
assert(pkg.scripts['build:eval'].includes('build-4-0-0-evaluation'), 'build:eval should point to Build 4.0.0 evaluation');

const nav = readFileSync('components/Nav.tsx', 'utf8');
assert(nav.includes('Build 4.0.0'), 'Nav badge should show Build 4.0.0');

const system = readFileSync('app/admin/system/page.tsx', 'utf8');
assert(system.includes('Migration Repair Required'), 'System page should surface migration repair requirement');
assert(system.includes('Scheduled Backup Endpoint'), 'System page should document scheduled backup endpoint');
assert(system.includes('Data Quality as Product Feature'), 'System page should position data quality as product feature');
assert(system.includes('WEEKLY_BACKUP_EXPORT'), 'System page should record weekly backup export checks');
assert(system.includes('MIGRATION_REPAIR_RUNBOOK'), 'System page should record migration repair runbook checks');

assert(existsSync('app/api/admin/backups/weekly/route.ts'), 'weekly backup API route should exist');
const weekly = readFileSync('app/api/admin/backups/weekly/route.ts', 'utf8');
assert(weekly.includes('CRON_SECRET'), 'weekly backup route should require CRON_SECRET');
assert(weekly.includes('BACKUP_POST_URL'), 'weekly backup route should support optional BACKUP_POST_URL');
assert(weekly.includes('WEEKLY_BACKUP_EXPORT'), 'weekly backup route should record SystemCheck status');
assert(weekly.includes('SCHEDULED_BACKUP_EXPORTED'), 'weekly backup route should audit scheduled backups');

assert(existsSync('MIGRATION_REPAIR_RUNBOOK_BUILD_4_0_0.md'), 'migration repair runbook should exist');
assert(existsSync('PILOT_READINESS_BUILD_4_0_0.md'), 'pilot readiness notes should exist');

const backup = readFileSync('app/api/reports/backup/route.ts', 'utf8');
assert(backup.includes("build: '4.0.0'"), 'manual backup export should identify Build 4.0.0');

console.log('Build 4.0.0 evaluation checks completed.');

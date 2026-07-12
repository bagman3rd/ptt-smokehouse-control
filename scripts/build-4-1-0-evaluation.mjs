import { readFileSync, existsSync } from 'fs';

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
assert(pkg.version === '4.1.0', 'package.json version should be 4.1.0');
assert(pkg.scripts['render-build'].includes('prisma migrate deploy'), 'render-build should use prisma migrate deploy');
assert(!pkg.scripts['render-build'].includes('prisma db push'), 'render-build must not use prisma db push');
assert(!('db:push' in pkg.scripts), 'db:push script should be removed');
assert(!pkg.scripts['render-build'].includes('--accept-data-loss'), 'render-build must not use --accept-data-loss');
assert(pkg.scripts['backup:weekly'].includes('run-weekly-backup-cron'), 'backup:weekly script should exist');
assert(pkg.scripts['build:eval'].includes('build-4-1-0-evaluation'), 'build:eval should point to Build 4.1.0 evaluation');

const nav = readFileSync('components/Nav.tsx', 'utf8');
assert(nav.includes('Build 4.1.0'), 'Nav badge should show Build 4.1.0');

const system = readFileSync('app/admin/system/page.tsx', 'utf8');
assert(system.includes('Migrate Deploy Mode'), 'System page should show migrate deploy mode');
assert(system.includes('Migration Repair Gate'), 'System page should show migration repair gate');
assert(system.includes('PRODUCTION_MIGRATION_REPAIR'), 'System page should track production migration repair');
assert(system.includes('WEEKLY_BACKUP_EXPORT'), 'System page should track weekly backup export');
assert(system.includes('Data Quality as Product Feature'), 'System page should position data quality as product feature');

assert(existsSync('MIGRATION_REPAIR_RUNBOOK_BUILD_4_1_0.md'), 'Build 4.1.0 migration repair runbook should exist');
assert(existsSync('BACKUP_RESTORE_DRILL_BUILD_4_1_0.md'), 'Build 4.1.0 backup restore drill doc should exist');
assert(existsSync('scripts/run-weekly-backup-cron.mjs'), 'weekly backup cron runner should exist');
assert(existsSync('app/api/admin/backups/weekly/route.ts'), 'weekly backup API route should exist');

const weekly = readFileSync('app/api/admin/backups/weekly/route.ts', 'utf8');
assert(weekly.includes('CRON_SECRET'), 'weekly backup route should require CRON_SECRET');
assert(weekly.includes('BACKUP_POST_URL'), 'weekly backup route should support optional BACKUP_POST_URL');
assert(weekly.includes("build: '4.1.0'"), 'weekly backup route should identify Build 4.1.0');

const cronRunner = readFileSync('scripts/run-weekly-backup-cron.mjs', 'utf8');
assert(cronRunner.includes('BACKUP_APP_URL'), 'cron runner should require BACKUP_APP_URL');
assert(cronRunner.includes('CRON_SECRET'), 'cron runner should require CRON_SECRET');

const render = readFileSync('render.yaml', 'utf8');
assert(render.includes('type: cron'), 'render.yaml should include optional cron job');
assert(render.includes('pnpm run backup:weekly'), 'cron job should run backup:weekly');

const backup = readFileSync('app/api/reports/backup/route.ts', 'utf8');
assert(backup.includes("build: '4.1.0'"), 'manual backup export should identify Build 4.1.0');

console.log('Build 4.1.0 evaluation checks completed.');

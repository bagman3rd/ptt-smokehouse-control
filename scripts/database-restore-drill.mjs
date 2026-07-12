import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sourceUrl = process.env.DATABASE_URL;
const restoreUrl = process.env.RESTORE_DATABASE_URL;
if (!sourceUrl || !restoreUrl) throw new Error('DATABASE_URL and RESTORE_DATABASE_URL are required.');

const work = mkdtempSync(join(tmpdir(), 'ptt-restore-drill-'));
const dump = join(work, 'database.dump');
const evidence = join(work, 'restore-evidence.txt');
const run = (command, args, env = {}) => execFileSync(command, args, { stdio: 'pipe', encoding: 'utf8', env: { ...process.env, ...env } });

try {
  run('pg_dump', ['--format=custom', '--no-owner', '--no-acl', '--file', dump, sourceUrl]);
  run('pg_restore', ['--clean', '--if-exists', '--no-owner', '--no-acl', '--dbname', restoreUrl, dump]);
  const tableCount = Number(run('psql', [restoreUrl, '-Atc', "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"]).trim());
  const migrationCount = Number(run('psql', [restoreUrl, '-Atc', 'SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;']).trim());
  const orphanCount = Number(run('psql', [restoreUrl, '-Atc', `SELECT
    (SELECT count(*) FROM "Protein" WHERE "restaurantId" IS NULL) +
    (SELECT count(*) FROM "CookPlan" WHERE "restaurantId" IS NULL) +
    (SELECT count(*) FROM "CookPlanItem" WHERE "restaurantId" IS NULL) +
    (SELECT count(*) FROM "EndOfDayLog" WHERE "restaurantId" IS NULL) +
    (SELECT count(*) FROM "EndOfDayProteinLog" WHERE "restaurantId" IS NULL) +
    (SELECT count(*) FROM "Smoker" WHERE "restaurantId" IS NULL) +
    (SELECT count(*) FROM "AuditLog" WHERE "restaurantId" IS NULL);`]).trim());
  if (tableCount < 26) throw new Error(`Restored database has only ${tableCount} tables; expected at least 26.`);
  if (migrationCount < 12) throw new Error(`Restored database has only ${migrationCount} completed migrations.`);
  if (orphanCount !== 0) throw new Error(`Restored database contains ${orphanCount} orphan core tenant rows.`);
  const report = [`timestamp=${new Date().toISOString()}`, `tables=${tableCount}`, `completed_migrations=${migrationCount}`, `orphan_core_rows=${orphanCount}`, 'result=PASS'].join('\n') + '\n';
  writeFileSync(process.env.RESTORE_EVIDENCE_PATH || evidence, report);
  console.log(report.trim());
} finally {
  if (!process.env.KEEP_RESTORE_ARTIFACTS) rmSync(work, { recursive: true, force: true });
}

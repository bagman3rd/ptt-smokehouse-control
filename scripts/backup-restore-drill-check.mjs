import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';

const path = process.argv[2];
if (!path) {
  console.log('Usage: node scripts/backup-restore-drill-check.mjs <tenant-export.json>');
  console.log('This validates that a downloaded tenant export has the sections needed for restore rehearsal.');
  process.exit(0);
}
assert.ok(existsSync(path), `Backup file not found: ${path}`);
const backup = JSON.parse(readFileSync(path, 'utf8'));
assert.ok(backup.restaurant?.id, 'backup must contain restaurant');
assert.ok(Array.isArray(backup.proteins), 'backup must contain proteins');
assert.ok(Array.isArray(backup.scenarios), 'backup must contain scenarios');
assert.ok(Array.isArray(backup.dayMultipliers), 'backup must contain day multipliers');
assert.ok(Array.isArray(backup.monthMultipliers), 'backup must contain month multipliers');
assert.ok(Array.isArray(backup.cookPlans), 'backup must contain cook plans');
assert.ok(Array.isArray(backup.endOfDayLogs), 'backup must contain EOD logs');
assert.ok(Array.isArray(backup.auditLogs), 'backup must contain audit logs');
console.log(`Backup restore-drill validation passed for ${backup.restaurant.name}.`);

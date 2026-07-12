import { addUtcDays } from '@/lib/date';

export type DataQualityResult = {
  score: number;
  label: 'LOW' | 'MEDIUM' | 'HIGH';
  checks: Array<{ key: string; label: string; complete: boolean; points: number; max: number; detail: string }>;
  warnings: string[];
};

function startOfUtcDay(date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function computeDataQuality(prisma: any, restaurantId: string): Promise<DataQualityResult> {
  const today = startOfUtcDay();
  const since = addUtcDays(today, -14);
  const [eodLogs, lockedLogs, cookPlans, approvedPlans, smokerCount, backupChecks, restoreChecks, reports] = await Promise.all([
    prisma.endOfDayLog.findMany({ where: { restaurantId, serviceDate: { gte: since, lte: today } }, include: { proteinLogs: true } }),
    prisma.endOfDayLog.count({ where: { restaurantId, serviceDate: { gte: since, lte: today }, status: { in: ['REVIEWED', 'LOCKED', 'COMPLETE'] } } }),
    prisma.cookPlan.count({ where: { restaurantId, serviceDate: { gte: since, lte: addUtcDays(today, 7) } } }),
    prisma.cookPlan.count({ where: { restaurantId, status: 'APPROVED', serviceDate: { gte: since, lte: addUtcDays(today, 7) } } }),
    prisma.smoker.count({ where: { restaurantId, active: true } }).catch(() => 0),
    prisma.systemCheck.count({ where: { restaurantId, type: 'BACKUP_EXPORT_TEST', status: 'PASS' } }).catch(() => 0),
    prisma.systemCheck.count({ where: { restaurantId, type: 'RESTORE_DRILL', status: 'PASS' } }).catch(() => 0),
    prisma.reportRun.count({ where: { restaurantId } }).catch(() => 0)
  ]);

  const completeEod = eodLogs.filter((log) => ['COMPLETE', 'REVIEWED', 'LOCKED'].includes(log.status)).length;
  const allZeroLogs = eodLogs.filter((log) => log.proteinLogs.every((p) => p.cookedUnits === 0 && p.soldCookedLb === 0 && p.usableLeftoverUnits === 0 && p.wasteLb === 0)).length;
  const missingLeftover = eodLogs.filter((log) => log.proteinLogs.some((p) => p.cookedUnits > 0 && p.usableLeftoverUnits === 0 && p.usableLeftoverLb === 0 && !p.eightySixed)).length;

  const checks = [
    { key: 'eod-complete', label: 'At least 7 completed EOD logs in recent history', complete: completeEod >= 7, points: Math.min(20, completeEod * 3), max: 20, detail: `${completeEod} complete/reviewed/locked EOD logs` },
    { key: 'eod-reviewed', label: 'EOD logs are reviewed/locked', complete: lockedLogs >= 5, points: Math.min(15, lockedLogs * 3), max: 15, detail: `${lockedLogs} reviewed/locked/complete EOD logs` },
    { key: 'cook-plans', label: 'Cook plans generated', complete: cookPlans >= 3, points: Math.min(15, cookPlans * 3), max: 15, detail: `${cookPlans} recent/upcoming cook plans` },
    { key: 'approved-plans', label: 'Cook plans approved before service', complete: approvedPlans >= 3, points: Math.min(10, approvedPlans * 3), max: 10, detail: `${approvedPlans} approved cook plans` },
    { key: 'smokers', label: 'Smoker capacity configured', complete: smokerCount > 0, points: smokerCount > 0 ? 15 : 0, max: 15, detail: `${smokerCount} active smokers` },
    { key: 'clean-eod', label: 'No all-zero or incomplete leftover logs', complete: allZeroLogs === 0 && missingLeftover === 0, points: Math.max(0, 15 - allZeroLogs * 5 - missingLeftover * 3), max: 15, detail: `${allZeroLogs} all-zero logs · ${missingLeftover} missing leftover warnings` },
    { key: 'backup', label: 'Backup/restore discipline recorded', complete: backupChecks > 0 && restoreChecks > 0, points: (backupChecks > 0 ? 5 : 0) + (restoreChecks > 0 ? 5 : 0), max: 10, detail: `${backupChecks} backup tests · ${restoreChecks} restore drills` },
    { key: 'reports', label: 'Reports/export history exists', complete: reports > 0, points: reports > 0 ? 5 : 0, max: 5, detail: `${reports} report/export records` }
  ];

  const score = Math.max(0, Math.min(100, Math.round(checks.reduce((sum, check) => sum + check.points, 0))));
  const label = score >= 80 ? 'HIGH' : score >= 55 ? 'MEDIUM' : 'LOW';
  const warnings = checks.filter((check) => !check.complete).map((check) => check.label);
  return { score, label, checks, warnings };
}

export function confidenceFromDataQuality(score: number) {
  if (score >= 80) return 'HIGH';
  if (score >= 55) return 'MEDIUM';
  return 'LOW';
}

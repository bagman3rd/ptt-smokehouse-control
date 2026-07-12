import { addUtcDays } from '@/lib/date';

export type ForecastProofPoint = {
  serviceDate: Date;
  planDate: Date;
  proteinId: string;
  proteinName: string;
  unit: string;
  forecastUnits: number;
  loadedUnits: number;
  actualDemandUnits: number;
  soldUnits: number;
  leftoverUnits: number;
  wasteLb: number;
  soldLb: number;
  eightySixed: boolean;
  absoluteErrorPct: number;
  signedErrorPct: number;
};

export type ForecastProofSummary = {
  proteinId: string;
  proteinName: string;
  unit: string;
  sampleCount7: number;
  sampleCount30: number;
  sampleCount90: number;
  mape7: number | null;
  mape30: number | null;
  mape90: number | null;
  accuracy7: number | null;
  accuracy30: number | null;
  accuracy90: number | null;
  bias30: 'Underforecasting' | 'Overforecasting' | 'Balanced' | 'No data';
  underforecastDays30: number;
  overforecastDays30: number;
  selloutCount30: number;
  avgLeftoverUnits30: number;
  avgWasteLb30: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  proofStatus: string;
};

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function displayUnit(proteinName: string, inputUnit: string) {
  const lower = proteinName.toLowerCase();
  if (lower.includes('pork')) return 'butts';
  if (lower.includes('rib')) return 'racks';
  if (lower.includes('chicken')) return 'breasts';
  if (lower.includes('brisket')) return 'briskets';
  return inputUnit.toLowerCase().replace('_', ' ');
}

function planDateForProtein(serviceDate: Date, proteinName: string) {
  const lower = proteinName.toLowerCase();
  if (lower.includes('brisket') || lower.includes('pork')) return addUtcDays(serviceDate, -1);
  return serviceDate;
}

function cookedUnitLb(protein: any) {
  const cookedWeight = Number(protein.cookedWeightEachLb ?? 0);
  if (cookedWeight > 0) return cookedWeight;
  const rawWeight = Number(protein.rawWeightEachLb ?? 0);
  const yieldPct = Number(protein.cookedYieldPercent ?? 0);
  return rawWeight * (yieldPct / 100);
}

function daysOld(date: Date, now = new Date()) {
  return Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())) / 86400000);
}

function avg(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function accuracyFromMape(mape: number | null) {
  return mape === null ? null : clamp(100 - mape, 0, 100);
}

function biasFromRows(rows: ForecastProofPoint[]) {
  if (!rows.length) return 'No data' as const;
  const avgSigned = avg(rows.map((row) => row.signedErrorPct)) ?? 0;
  if (avgSigned > 8) return 'Underforecasting' as const;
  if (avgSigned < -8) return 'Overforecasting' as const;
  return 'Balanced' as const;
}

export function buildForecastProofPoints(args: { proteins: any[]; plans: any[]; logs: any[]; now?: Date }) {
  const now = args.now ?? new Date();
  const planByDate = new Map<string, any>();
  for (const plan of args.plans) planByDate.set(iso(plan.serviceDate), plan);

  const points: ForecastProofPoint[] = [];
  for (const log of args.logs) {
    for (const proteinLog of (log.proteinLogs ?? []) as any[]) {
      const protein = proteinLog.protein || args.proteins.find((candidate) => candidate.id === proteinLog.proteinId);
      if (!protein) continue;
      const matchingPlanDate = planDateForProtein(log.serviceDate, protein.name);
      const plan = planByDate.get(iso(matchingPlanDate));
      if (!plan) continue;
      const item = (plan.items ?? []).find((candidate: any) => candidate.proteinId === protein.id);
      if (!item) continue;
      const unitWeight = cookedUnitLb(protein);
      const soldUnits = unitWeight > 0 ? Number(proteinLog.soldCookedLb ?? 0) / unitWeight : 0;
      const forecastUnits = Number(item.forecastCookUnits || item.recommendedCookUnits || 0);
      const loadedUnits = Number(item.approvedCookUnits ?? item.recommendedCookUnits ?? forecastUnits ?? 0);
      const selloutCredit = proteinLog.eightySixed ? Math.max(1, forecastUnits * 0.08) : 0;
      const actualDemandUnits = soldUnits + selloutCredit;
      const signedErrorPct = forecastUnits > 0 ? ((actualDemandUnits - forecastUnits) / forecastUnits) * 100 : 0;
      points.push({
        serviceDate: log.serviceDate,
        planDate: matchingPlanDate,
        proteinId: protein.id,
        proteinName: protein.name,
        unit: displayUnit(protein.name, protein.inputUnit),
        forecastUnits,
        loadedUnits,
        actualDemandUnits,
        soldUnits,
        leftoverUnits: Number(proteinLog.usableLeftoverUnits ?? 0),
        wasteLb: Number(proteinLog.wasteLb ?? 0),
        soldLb: Number(proteinLog.soldCookedLb ?? 0),
        eightySixed: Boolean(proteinLog.eightySixed),
        absoluteErrorPct: Math.abs(signedErrorPct),
        signedErrorPct
      });
    }
  }

  return points.filter((point) => daysOld(point.serviceDate, now) <= 90);
}

export function summarizeForecastProof(points: ForecastProofPoint[], proteins: any[], now = new Date()): ForecastProofSummary[] {
  return proteins.map((protein: any) => {
    const rows = points.filter((point) => point.proteinId === protein.id);
    const rows7 = rows.filter((point) => daysOld(point.serviceDate, now) <= 7);
    const rows30 = rows.filter((point) => daysOld(point.serviceDate, now) <= 30);
    const rows90 = rows.filter((point) => daysOld(point.serviceDate, now) <= 90);
    const mape7 = avg(rows7.map((row) => row.absoluteErrorPct));
    const mape30 = avg(rows30.map((row) => row.absoluteErrorPct));
    const mape90 = avg(rows90.map((row) => row.absoluteErrorPct));
    const confidence = rows30.length >= 30 ? 'HIGH' : rows30.length >= 14 ? 'MEDIUM' : 'LOW';
    const proofStatus = rows30.length >= 60
      ? 'Pilot proof asset forming. 60+ matched samples available across proteins.'
      : rows30.length >= 14
        ? 'Useful early signal. Keep collecting completed EOD logs.'
        : 'Launch model only. Needs more matched cook-plan/EOD history.';
    return {
      proteinId: protein.id,
      proteinName: protein.name,
      unit: displayUnit(protein.name, protein.inputUnit),
      sampleCount7: rows7.length,
      sampleCount30: rows30.length,
      sampleCount90: rows90.length,
      mape7,
      mape30,
      mape90,
      accuracy7: accuracyFromMape(mape7),
      accuracy30: accuracyFromMape(mape30),
      accuracy90: accuracyFromMape(mape90),
      bias30: biasFromRows(rows30),
      underforecastDays30: rows30.filter((row) => row.signedErrorPct > 8).length,
      overforecastDays30: rows30.filter((row) => row.signedErrorPct < -8).length,
      selloutCount30: rows30.filter((row) => row.eightySixed).length,
      avgLeftoverUnits30: avg(rows30.map((row) => row.leftoverUnits)) ?? 0,
      avgWasteLb30: avg(rows30.map((row) => row.wasteLb)) ?? 0,
      confidence,
      proofStatus
    };
  });
}

export function recentForecastProofRows(points: ForecastProofPoint[], limit = 30) {
  return [...points].sort((a, b) => b.serviceDate.getTime() - a.serviceDate.getTime()).slice(0, limit);
}

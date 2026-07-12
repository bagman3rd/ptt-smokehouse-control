import { COOK_WINDOW, labelForCookWindow, labelForSmokerLocation, PROTEIN_CODE, type ProteinCode } from '@/lib/domainCodes';
export type SmokerScheduleSmoker = {
  id: string;
  name: string;
  model: string | null;
  location: string | null;
  rackCount: number;
  brisketCapacity: number;
  porkCapacity: number;
  ribCapacity: number;
  chickenCapacity: number;
  cookWindow: string | null;
  active: boolean;
};

export type SmokerScheduleProtein = { name: string; inputUnit: string; code?: string | null };
export type SmokerScheduleItem = { id: string; recommendedCookUnits: number; approvedCookUnits: number | null; protein: SmokerScheduleProtein };
export type SmokerSchedulePlan = { id: string; serviceDate: Date; status: string; items: SmokerScheduleItem[] };
export type ProteinKind = ProteinCode;

export type SmokerAllocation = {
  smokerId: string;
  smokerName: string;
  smokerModel: string;
  smokerLocation: string;
  cookWindow: string;
  units: number;
  capacity: number;
  isBackup: boolean;
};

export type SmokerScheduleRow = {
  proteinName: string;
  proteinKind: ProteinKind;
  units: number;
  unitLabel: string;
  smokerName: string;
  smokerModel: string;
  smokerLocation: string;
  allocationSummary: string;
  allocations: SmokerAllocation[];
  startTime: string;
  endTime: string;
  phase: string;
  instruction: string;
  capacity: number;
  capacityStatus: 'OK' | 'WARNING' | 'NOT_CONFIGURED';
  warning: string | null;
  suggestedFix: string | null;
};

export function proteinKind(name: string, code?: string | null): ProteinKind {
  if (code && Object.values(PROTEIN_CODE).includes(code as ProteinCode)) return code as ProteinCode;
  const lower = name.toLowerCase();
  if (lower.includes('brisket')) return PROTEIN_CODE.BRISKET;
  if (lower.includes('pork')) return PROTEIN_CODE.PORK;
  if (lower.includes('rib')) return PROTEIN_CODE.RIBS;
  if (lower.includes('chicken')) return PROTEIN_CODE.CHICKEN;
  return PROTEIN_CODE.OTHER;
}

export function displayProteinUnit(proteinName: string, inputUnit: string): string {
  const kind = proteinKind(proteinName);
  if (kind === PROTEIN_CODE.PORK) return 'butts';
  if (kind === PROTEIN_CODE.RIBS) return 'racks';
  if (kind === PROTEIN_CODE.CHICKEN) return 'breasts';
  if (kind === PROTEIN_CODE.BRISKET) return 'briskets';
  return inputUnit.toLowerCase().replace('_', ' ');
}

function smokerCapacityFor(smoker: SmokerScheduleSmoker, kind: ProteinKind): number {
  if (kind === PROTEIN_CODE.BRISKET) return smoker.brisketCapacity || 0;
  if (kind === PROTEIN_CODE.PORK) return smoker.porkCapacity || 0;
  if (kind === PROTEIN_CODE.RIBS) return smoker.ribCapacity || 0;
  if (kind === PROTEIN_CODE.CHICKEN) return smoker.chickenCapacity || 0;
  return 0;
}

function isOvernightKind(kind: ProteinKind): boolean { return kind === PROTEIN_CODE.BRISKET || kind === PROTEIN_CODE.PORK; }
function normalizedWindow(smoker: SmokerScheduleSmoker): string { return smoker.cookWindow || COOK_WINDOW.FLEXIBLE; }

export function smokerEligibleForKind(smoker: SmokerScheduleSmoker, kind: ProteinKind): boolean {
  if (!smoker.active) return false;
  const window = normalizedWindow(smoker);
  if (window === COOK_WINDOW.INACTIVE) return false;
  if (window === COOK_WINDOW.BACKUP_OVERFLOW) return true;
  if (kind === PROTEIN_CODE.OTHER) return window === COOK_WINDOW.FLEXIBLE;
  return isOvernightKind(kind)
    ? window === COOK_WINDOW.OVERNIGHT_ONLY || window === COOK_WINDOW.FLEXIBLE
    : window === COOK_WINDOW.SAME_DAY_ONLY || window === COOK_WINDOW.FLEXIBLE;
}

function priorityFor(smoker: SmokerScheduleSmoker, kind: ProteinKind): number {
  const window = normalizedWindow(smoker);
  if (window === COOK_WINDOW.BACKUP_OVERFLOW) return 3;
  if (isOvernightKind(kind) && window === COOK_WINDOW.OVERNIGHT_ONLY) return 1;
  if (!isOvernightKind(kind) && kind !== PROTEIN_CODE.OTHER && window === COOK_WINDOW.SAME_DAY_ONLY) return 1;
  return 2;
}

export function capacityForProtein(smokers: SmokerScheduleSmoker[], proteinName: string): number {
  const kind = proteinKind(proteinName);
  return smokers.filter((smoker) => smokerEligibleForKind(smoker, kind)).reduce((sum, smoker) => sum + smokerCapacityFor(smoker, kind), 0);
}

function allocateLoad(smokers: SmokerScheduleSmoker[], kind: ProteinKind, units: number): { allocations: SmokerAllocation[]; totalCapacity: number; remaining: number } {
  const ranked = smokers
    .filter((smoker) => smokerEligibleForKind(smoker, kind) && smokerCapacityFor(smoker, kind) > 0)
    .sort((a, b) => priorityFor(a, kind) - priorityFor(b, kind) || smokerCapacityFor(b, kind) - smokerCapacityFor(a, kind) || a.name.localeCompare(b.name));
  const totalCapacity = ranked.reduce((sum, smoker) => sum + smokerCapacityFor(smoker, kind), 0);
  let remaining = Math.max(0, units);
  const allocations: SmokerAllocation[] = [];
  for (const smoker of ranked) {
    if (remaining <= 0) break;
    const capacity = smokerCapacityFor(smoker, kind);
    const assigned = Math.min(remaining, capacity);
    allocations.push({
      smokerId: smoker.id,
      smokerName: smoker.name,
      smokerModel: smoker.model || 'No model entered',
      smokerLocation: labelForSmokerLocation(smoker.location),
      cookWindow: labelForCookWindow(normalizedWindow(smoker)),
      units: assigned,
      capacity,
      isBackup: normalizedWindow(smoker) === COOK_WINDOW.BACKUP_OVERFLOW
    });
    remaining -= assigned;
  }
  return { allocations, totalCapacity, remaining };
}

function defaultTiming(kind: ProteinKind): Pick<SmokerScheduleRow, 'startTime' | 'endTime' | 'phase' | 'instruction' | 'suggestedFix'> {
  if (kind === PROTEIN_CODE.PORK) return { startTime: '5:00 PM prior day', endTime: 'Overnight / next morning', phase: 'Overnight prior-day load', instruction: 'Load pork butts at 5:00 PM for next-day service; verify hot-hold plan before close.', suggestedFix: 'Activate additional overnight or flexible capacity, use a backup smoker, or schedule another overnight cycle.' };
  if (kind === PROTEIN_CODE.BRISKET) return { startTime: '9:00 AM', endTime: '9:00 PM / hot hold overnight', phase: 'Prior-day brisket cook', instruction: 'Cook briskets 9:00 AM–9:00 PM, then hold overnight for next-day service.', suggestedFix: 'Activate additional overnight or flexible capacity, use a backup smoker, or schedule another brisket cycle.' };
  if (kind === PROTEIN_CODE.RIBS) return { startTime: '8:00 AM same day', endTime: 'Lunch service window', phase: 'Same-day rib cook', instruction: 'Load ribs same day after hot-box verification; cook against today’s service demand.', suggestedFix: 'Activate additional same-day or flexible capacity, use a backup smoker, or stagger rib loads.' };
  if (kind === PROTEIN_CODE.CHICKEN) return { startTime: '10:00 AM same day', endTime: 'Lunch / afternoon service window', phase: 'Same-day chicken cook', instruction: 'Load chicken breasts same day after hot-box verification; avoid overholding.', suggestedFix: 'Activate additional same-day or flexible capacity, use a backup smoker, or cook chicken in waves.' };
  return { startTime: 'Manager scheduled', endTime: 'Manager scheduled', phase: 'Custom cook', instruction: 'Schedule per kitchen manager direction.', suggestedFix: 'Add a protein-specific cook cycle before relying on automated scheduling.' };
}

export function buildSmokerLoadSchedule(smokers: SmokerScheduleSmoker[], plan: SmokerSchedulePlan | null): SmokerScheduleRow[] {
  if (!plan) return [];
  return plan.items.map((item) => {
    const units = item.approvedCookUnits ?? item.recommendedCookUnits;
    const kind = proteinKind(item.protein.name, item.protein.code);
    const { allocations, totalCapacity, remaining } = allocateLoad(smokers, kind, units);
    const timing = defaultTiming(kind);
    const unitLabel = displayProteinUnit(item.protein.name, item.protein.inputUnit);
    const capacityStatus = totalCapacity <= 0 ? 'NOT_CONFIGURED' : remaining > 0 ? 'WARNING' : 'OK';
    const primary = allocations[0];
    const allocationSummary = allocations.length
      ? allocations.map((a) => `${a.units} ${unitLabel} → ${a.smokerName}${a.isBackup ? ' (backup)' : ''}`).join('; ')
      : 'No eligible smoker assignment';
    const warning = capacityStatus === 'NOT_CONFIGURED'
      ? `${item.protein.name}: no eligible ${isOvernightKind(kind) ? 'overnight' : 'same-day'} smoker capacity is configured.`
      : capacityStatus === 'WARNING'
        ? `${item.protein.name}: ${units} ${unitLabel} exceeds eligible capacity of ${totalCapacity} by ${remaining}.`
        : null;
    return {
      proteinName: item.protein.name,
      proteinKind: kind,
      units,
      unitLabel,
      smokerName: allocations.length === 1 ? primary.smokerName : allocations.length > 1 ? `${allocations.length} smokers` : 'No eligible smoker configured',
      smokerModel: allocations.length === 1 ? primary.smokerModel : allocations.length > 1 ? 'Split load' : 'No model entered',
      smokerLocation: allocations.length === 1 ? primary.smokerLocation : allocations.length > 1 ? 'Multiple locations' : 'No location entered',
      allocationSummary,
      allocations,
      startTime: timing.startTime,
      endTime: timing.endTime,
      phase: timing.phase,
      instruction: timing.instruction,
      capacity: totalCapacity,
      capacityStatus,
      warning,
      suggestedFix: capacityStatus === 'OK' ? null : timing.suggestedFix
    };
  });
}

export function scheduleWarnings(rows: SmokerScheduleRow[]): string[] { return rows.flatMap((row) => row.warning ? [row.warning] : []); }

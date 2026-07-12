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

export type SmokerScheduleProtein = { name: string; inputUnit: string };
export type SmokerScheduleItem = { id: string; recommendedCookUnits: number; approvedCookUnits: number | null; protein: SmokerScheduleProtein };
export type SmokerSchedulePlan = { id: string; serviceDate: Date; status: string; items: SmokerScheduleItem[] };
export type ProteinKind = 'brisket' | 'pork' | 'ribs' | 'chicken' | 'other';

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

export function proteinKind(name: string): ProteinKind {
  const lower = name.toLowerCase();
  if (lower.includes('brisket')) return 'brisket';
  if (lower.includes('pork')) return 'pork';
  if (lower.includes('rib')) return 'ribs';
  if (lower.includes('chicken')) return 'chicken';
  return 'other';
}

export function displayProteinUnit(proteinName: string, inputUnit: string): string {
  const kind = proteinKind(proteinName);
  if (kind === 'pork') return 'butts';
  if (kind === 'ribs') return 'racks';
  if (kind === 'chicken') return 'breasts';
  if (kind === 'brisket') return 'briskets';
  return inputUnit.toLowerCase().replace('_', ' ');
}

function smokerCapacityFor(smoker: SmokerScheduleSmoker, kind: ProteinKind): number {
  if (kind === 'brisket') return smoker.brisketCapacity || 0;
  if (kind === 'pork') return smoker.porkCapacity || 0;
  if (kind === 'ribs') return smoker.ribCapacity || 0;
  if (kind === 'chicken') return smoker.chickenCapacity || 0;
  return 0;
}

function isOvernightKind(kind: ProteinKind): boolean { return kind === 'brisket' || kind === 'pork'; }
function normalizedWindow(smoker: SmokerScheduleSmoker): string { return smoker.cookWindow || 'All day / flexible'; }

export function smokerEligibleForKind(smoker: SmokerScheduleSmoker, kind: ProteinKind): boolean {
  if (!smoker.active) return false;
  const window = normalizedWindow(smoker);
  if (window === 'Not currently active') return false;
  if (window === 'Backup / overflow only') return true;
  if (kind === 'other') return window === 'All day / flexible';
  return isOvernightKind(kind)
    ? window === 'Overnight only' || window === 'All day / flexible'
    : window === 'Same-day only' || window === 'All day / flexible';
}

function priorityFor(smoker: SmokerScheduleSmoker, kind: ProteinKind): number {
  const window = normalizedWindow(smoker);
  if (window === 'Backup / overflow only') return 3;
  if (isOvernightKind(kind) && window === 'Overnight only') return 1;
  if (!isOvernightKind(kind) && kind !== 'other' && window === 'Same-day only') return 1;
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
      smokerLocation: smoker.location || 'No location entered',
      cookWindow: normalizedWindow(smoker),
      units: assigned,
      capacity,
      isBackup: normalizedWindow(smoker) === 'Backup / overflow only'
    });
    remaining -= assigned;
  }
  return { allocations, totalCapacity, remaining };
}

function defaultTiming(kind: ProteinKind): Pick<SmokerScheduleRow, 'startTime' | 'endTime' | 'phase' | 'instruction' | 'suggestedFix'> {
  if (kind === 'pork') return { startTime: '5:00 PM prior day', endTime: 'Overnight / next morning', phase: 'Overnight prior-day load', instruction: 'Load pork butts at 5:00 PM for next-day service; verify hot-hold plan before close.', suggestedFix: 'Activate additional overnight or flexible capacity, use a backup smoker, or schedule another overnight cycle.' };
  if (kind === 'brisket') return { startTime: '9:00 AM', endTime: '9:00 PM / hot hold overnight', phase: 'Prior-day brisket cook', instruction: 'Cook briskets 9:00 AM–9:00 PM, then hold overnight for next-day service.', suggestedFix: 'Activate additional overnight or flexible capacity, use a backup smoker, or schedule another brisket cycle.' };
  if (kind === 'ribs') return { startTime: '8:00 AM same day', endTime: 'Lunch service window', phase: 'Same-day rib cook', instruction: 'Load ribs same day after hot-box verification; cook against today’s service demand.', suggestedFix: 'Activate additional same-day or flexible capacity, use a backup smoker, or stagger rib loads.' };
  if (kind === 'chicken') return { startTime: '10:00 AM same day', endTime: 'Lunch / afternoon service window', phase: 'Same-day chicken cook', instruction: 'Load chicken breasts same day after hot-box verification; avoid overholding.', suggestedFix: 'Activate additional same-day or flexible capacity, use a backup smoker, or cook chicken in waves.' };
  return { startTime: 'Manager scheduled', endTime: 'Manager scheduled', phase: 'Custom cook', instruction: 'Schedule per kitchen manager direction.', suggestedFix: 'Add a protein-specific cook cycle before relying on automated scheduling.' };
}

export function buildSmokerLoadSchedule(smokers: SmokerScheduleSmoker[], plan: SmokerSchedulePlan | null): SmokerScheduleRow[] {
  if (!plan) return [];
  return plan.items.map((item) => {
    const units = item.approvedCookUnits ?? item.recommendedCookUnits;
    const kind = proteinKind(item.protein.name);
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

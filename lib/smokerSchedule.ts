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

export type SmokerScheduleProtein = {
  name: string;
  inputUnit: string;
};

export type SmokerScheduleItem = {
  id: string;
  recommendedCookUnits: number;
  approvedCookUnits: number | null;
  protein: SmokerScheduleProtein;
};

export type SmokerSchedulePlan = {
  id: string;
  serviceDate: Date;
  status: string;
  items: SmokerScheduleItem[];
};

export type ProteinKind = 'brisket' | 'pork' | 'ribs' | 'chicken' | 'other';

export type SmokerScheduleRow = {
  proteinName: string;
  proteinKind: ProteinKind;
  units: number;
  unitLabel: string;
  smokerName: string;
  smokerModel: string;
  smokerLocation: string;
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

export function capacityForProtein(smokers: SmokerScheduleSmoker[], proteinName: string): number {
  const kind = proteinKind(proteinName);
  return smokers.filter((smoker) => smoker.active).reduce((sum, smoker) => {
    if (kind === 'brisket') return sum + (smoker.brisketCapacity || 0);
    if (kind === 'pork') return sum + (smoker.porkCapacity || 0);
    if (kind === 'ribs') return sum + (smoker.ribCapacity || 0);
    if (kind === 'chicken') return sum + (smoker.chickenCapacity || 0);
    return sum;
  }, 0);
}

function smokerCapacityFor(smoker: SmokerScheduleSmoker, kind: ProteinKind): number {
  if (kind === 'brisket') return smoker.brisketCapacity || 0;
  if (kind === 'pork') return smoker.porkCapacity || 0;
  if (kind === 'ribs') return smoker.ribCapacity || 0;
  if (kind === 'chicken') return smoker.chickenCapacity || 0;
  return 0;
}

function bestSmokerFor(smokers: SmokerScheduleSmoker[], kind: ProteinKind): SmokerScheduleSmoker | null {
  const active = smokers.filter((smoker) => smoker.active);
  if (active.length === 0) return null;
  const ranked = [...active].sort((a, b) => smokerCapacityFor(b, kind) - smokerCapacityFor(a, kind));
  return ranked[0] ?? null;
}

function defaultTiming(kind: ProteinKind): Pick<SmokerScheduleRow, 'startTime' | 'endTime' | 'phase' | 'instruction' | 'suggestedFix'> {
  if (kind === 'pork') return {
    startTime: '5:00 PM prior day',
    endTime: 'Overnight / next morning',
    phase: 'Overnight prior-day load',
    instruction: 'Load pork butts at 5:00 PM for next-day service; verify hot-hold plan before close.',
    suggestedFix: 'Split pork between active smokers, lower same-day safety factor, or start an additional overnight load.'
  };
  if (kind === 'brisket') return {
    startTime: '9:00 AM',
    endTime: '9:00 PM / hot hold overnight',
    phase: 'Prior-day brisket cook',
    instruction: 'Cook briskets 9:00 AM–9:00 PM, then hold overnight for next-day service.',
    suggestedFix: 'Split brisket across smokers, start earlier, or reduce approved units only with manager reason.'
  };
  if (kind === 'ribs') return {
    startTime: '8:00 AM same day',
    endTime: 'Lunch service window',
    phase: 'Same-day rib cook',
    instruction: 'Load ribs same day after hot-box verification; cook against today’s service demand.',
    suggestedFix: 'Move rib cook earlier, split racks across smokers, or stagger ribs before chicken.'
  };
  if (kind === 'chicken') return {
    startTime: '10:00 AM same day',
    endTime: 'Lunch / afternoon service window',
    phase: 'Same-day chicken cook',
    instruction: 'Load chicken breasts same day after hot-box verification; avoid overholding.',
    suggestedFix: 'Cook chicken in smaller waves or split same-day capacity across smokers.'
  };
  return {
    startTime: 'Manager scheduled',
    endTime: 'Manager scheduled',
    phase: 'Custom cook',
    instruction: 'Schedule per kitchen manager direction.',
    suggestedFix: 'Add a protein-specific cook cycle before relying on automated scheduling.'
  };
}

export function buildSmokerLoadSchedule(smokers: SmokerScheduleSmoker[], plan: SmokerSchedulePlan | null): SmokerScheduleRow[] {
  if (!plan) return [];
  return plan.items.map((item) => {
    const units = item.approvedCookUnits ?? item.recommendedCookUnits;
    const kind = proteinKind(item.protein.name);
    const smoker = bestSmokerFor(smokers, kind);
    const capacity = smoker ? smokerCapacityFor(smoker, kind) : 0;
    const timing = defaultTiming(kind);
    const unitLabel = displayProteinUnit(item.protein.name, item.protein.inputUnit);
    const capacityStatus = capacity <= 0 ? 'NOT_CONFIGURED' : units > capacity ? 'WARNING' : 'OK';
    const warning = capacityStatus === 'NOT_CONFIGURED'
      ? `${item.protein.name}: no active smoker capacity configured.`
      : capacityStatus === 'WARNING'
        ? `${item.protein.name}: ${units} ${unitLabel} exceeds ${smoker?.name || 'active smoker'} capacity of ${capacity}.`
        : null;
    return {
      proteinName: item.protein.name,
      proteinKind: kind,
      units,
      unitLabel,
      smokerName: smoker?.name || 'No active smoker configured',
      smokerModel: smoker?.model || 'No model entered',
      smokerLocation: smoker?.location || 'No location entered',
      startTime: timing.startTime,
      endTime: timing.endTime,
      phase: timing.phase,
      instruction: timing.instruction,
      capacity,
      capacityStatus,
      warning,
      suggestedFix: capacityStatus === 'OK' ? null : timing.suggestedFix
    };
  });
}

export function scheduleWarnings(rows: SmokerScheduleRow[]): string[] {
  return rows.flatMap((row) => row.warning ? [row.warning] : []);
}

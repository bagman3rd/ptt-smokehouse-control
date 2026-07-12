export const COOK_WINDOW = {
  OVERNIGHT_ONLY: 'OVERNIGHT_ONLY',
  SAME_DAY_ONLY: 'SAME_DAY_ONLY',
  FLEXIBLE: 'FLEXIBLE',
  BACKUP_OVERFLOW: 'BACKUP_OVERFLOW',
  INACTIVE: 'INACTIVE'
} as const;
export type CookWindowCode = typeof COOK_WINDOW[keyof typeof COOK_WINDOW];

export const COOK_WINDOW_LABELS: Record<CookWindowCode, string> = {
  OVERNIGHT_ONLY: 'Overnight only',
  SAME_DAY_ONLY: 'Same-day only',
  FLEXIBLE: 'All day / flexible',
  BACKUP_OVERFLOW: 'Backup / overflow only',
  INACTIVE: 'Not currently active'
};

export const SMOKER_LOCATION = {
  OUTDOOR: 'OUTDOOR',
  INDOOR_HOOD: 'INDOOR_HOOD',
  IN_WALL: 'IN_WALL',
  OUTDOOR_SMOKEHOUSE: 'OUTDOOR_SMOKEHOUSE'
} as const;
export type SmokerLocationCode = typeof SMOKER_LOCATION[keyof typeof SMOKER_LOCATION];

export const SMOKER_LOCATION_LABELS: Record<SmokerLocationCode, string> = {
  OUTDOOR: 'Outdoor',
  INDOOR_HOOD: 'Indoors under hood',
  IN_WALL: 'In the wall',
  OUTDOOR_SMOKEHOUSE: 'Outdoors in smoke house'
};

export const PROTEIN_CODE = {
  BRISKET: 'BRISKET',
  PORK: 'PORK',
  RIBS: 'RIBS',
  CHICKEN: 'CHICKEN',
  OTHER: 'OTHER'
} as const;
export type ProteinCode = typeof PROTEIN_CODE[keyof typeof PROTEIN_CODE];

export function labelForCookWindow(value: string | null | undefined): string {
  return COOK_WINDOW_LABELS[value as CookWindowCode] || value || COOK_WINDOW_LABELS.FLEXIBLE;
}
export function labelForSmokerLocation(value: string | null | undefined): string {
  return SMOKER_LOCATION_LABELS[value as SmokerLocationCode] || value || 'No location entered';
}

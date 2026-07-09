export type DayPatternKey = 'default-tourist' | 'summer' | 'shoulder-season' | 'rod-run-event';

export type DayPatternProfile = {
  key: DayPatternKey;
  name: string;
  shares: Record<number, number>;
};

export const dayPatternProfiles: DayPatternProfile[] = [
  { key: 'default-tourist', name: 'Default Tourist', shares: { 1: 9, 2: 8, 3: 10, 4: 12, 5: 17, 6: 25, 0: 19 } },
  { key: 'summer', name: 'Summer', shares: { 1: 10, 2: 10, 3: 12, 4: 13, 5: 16, 6: 22, 0: 17 } },
  { key: 'shoulder-season', name: 'Shoulder Season', shares: { 1: 8, 2: 7, 3: 9, 4: 11, 5: 18, 6: 28, 0: 19 } },
  { key: 'rod-run-event', name: 'Rod Run / Event', shares: { 1: 5, 2: 5, 3: 7, 4: 13, 5: 24, 6: 32, 0: 14 } }
];

export function shareToMultiplier(sharePercent: number) {
  return (sharePercent / 100) * 7;
}

export function getDayPatternByKey(key?: string | null) {
  return dayPatternProfiles.find((profile) => profile.key === key) ?? dayPatternProfiles[0];
}

export function inferDayPatternKey(scenarioName?: string | null): DayPatternKey {
  if ((scenarioName ?? '').toLowerCase().includes('rod')) return 'rod-run-event';
  return 'default-tourist';
}

export function getDayPatternMultiplier(key: string | null | undefined, dayOfWeek: number) {
  const profile = getDayPatternByKey(key);
  return shareToMultiplier(profile.shares[dayOfWeek] ?? (100 / 7));
}

export function dayPatternRows() {
  const labels: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun' };
  const order = [1, 2, 3, 4, 5, 6, 0];
  return dayPatternProfiles.map((profile) => ({
    key: profile.key,
    name: profile.name,
    days: order.map((dayOfWeek) => ({
      dayOfWeek,
      label: labels[dayOfWeek],
      share: profile.shares[dayOfWeek],
      multiplier: shareToMultiplier(profile.shares[dayOfWeek])
    }))
  }));
}

export function fmtDateWithDow(date: Date) {
  const iso = date.toISOString().slice(0, 10);
  const dow = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  return `${iso} ${dow}`;
}

export function addUtcDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function fmtTimeRangeNote(date: Date, note: string) {
  return `${fmtDateWithDow(date)} — ${note}`;
}

export function fmtDateWithDow(date: Date) {
  const iso = date.toISOString().slice(0, 10);
  const dow = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  return `${iso} ${dow}`;
}

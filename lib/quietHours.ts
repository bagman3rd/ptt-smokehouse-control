// Build 10.0.0 — TCPA quiet-hours enforcement.
// Marketing messages may only be sent 8:00 AM – 9:00 PM in the recipient's
// local time zone. Transactional messages are exempt.

const QUIET_START_HOUR = 8; // 8:00 AM inclusive
const QUIET_END_HOUR = 21; // 9:00 PM (21:00) exclusive

/**
 * Returns the local hour (0-23) for a given instant in a given IANA time zone.
 * Uses Intl to avoid pulling in a date library.
 */
export function localHourInZone(date: Date, timeZone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const hourPart = parts.find((p) => p.type === 'hour');
    const hour = hourPart ? parseInt(hourPart.value, 10) : NaN;
    // Intl can emit "24" for midnight in hour12:false; normalize to 0.
    return Number.isFinite(hour) ? hour % 24 : new Date(date).getUTCHours();
  } catch {
    // Unknown time zone → fall back to Eastern (primary market) then UTC.
    return date.getUTCHours();
  }
}

export function isWithinQuietHours(date: Date, timeZone: string): boolean {
  const hour = localHourInZone(date, timeZone);
  return hour < QUIET_START_HOUR || hour >= QUIET_END_HOUR;
}

/**
 * If the instant is inside quiet hours, returns the next allowed send time
 * (8:00 AM local). Otherwise returns null (send now).
 */
export function nextAllowedSendTime(date: Date, timeZone: string): Date | null {
  if (!isWithinQuietHours(date, timeZone)) return null;

  const hour = localHourInZone(date, timeZone);
  const target = new Date(date);
  if (hour >= QUIET_END_HOUR) {
    // Evening → defer to 8 AM next day.
    target.setUTCDate(target.getUTCDate() + 1);
  }
  // Compute the UTC offset for the zone at this date, then set 8 AM local.
  const localOffsetMinutes = zoneOffsetMinutes(date, timeZone);
  // 8 AM local expressed in UTC:
  target.setUTCHours(QUIET_START_HOUR, 0, 0, 0);
  target.setUTCMinutes(target.getUTCMinutes() - localOffsetMinutes);
  return target;
}

/** Approximate UTC offset (minutes) for a zone at a given instant. */
function zoneOffsetMinutes(date: Date, timeZone: string): number {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    const parts = dtf.formatToParts(date);
    const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value || '0', 10);
    const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'));
    return Math.round((asUTC - date.getTime()) / 60000);
  } catch {
    return 0;
  }
}

export const QUIET_HOURS = { start: QUIET_START_HOUR, end: QUIET_END_HOUR };

export const IST_TIME_ZONE = 'Asia/Kolkata';

function isValidDate(value: Date) {
  return !Number.isNaN(value.getTime());
}

export function parseTimestamp(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (isValidDate(parsed)) return parsed;

  const parts = String(value).match(/(\d+)\/(\d+)\/(\d+),?\s*(\d+):(\d+)(?::(\d+))?\s*(am|pm)?/i);
  if (!parts) return null;

  let [, day, month, year, hours, minutes, seconds = '0', ampm] = parts;
  let h = Number.parseInt(hours, 10);
  if (ampm) {
    const lowered = ampm.toLowerCase();
    if (lowered === 'pm' && h !== 12) h += 12;
    if (lowered === 'am' && h === 12) h = 0;
  }

  const utcMillis = Date.UTC(Number.parseInt(year, 10), Number.parseInt(month, 10) - 1, Number.parseInt(day, 10), h - 5, Number.parseInt(minutes, 10) - 30, Number.parseInt(seconds, 10));
  const normalized = new Date(utcMillis);
  return isValidDate(normalized) ? normalized : null;
}

export function nowIso() {
  return new Date().toISOString();
}

export function compareTimestampsDesc(left: unknown, right: unknown) {
  const leftTime = parseTimestamp(String(left ?? ''))?.getTime() ?? Number.NEGATIVE_INFINITY;
  const rightTime = parseTimestamp(String(right ?? ''))?.getTime() ?? Number.NEGATIVE_INFINITY;
  return rightTime - leftTime;
}

export function compareTimestampsAsc(left: unknown, right: unknown) {
  return compareTimestampsDesc(right, left);
}

export function formatInIST(value?: string | Date | null, options?: Intl.DateTimeFormatOptions) {
  const parsed = value instanceof Date ? value : parseTimestamp(value ?? '');
  if (!parsed) return '—';
  return parsed.toLocaleString('en-IN', {
    timeZone: IST_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  });
}

export function formatDateInIST(value?: string | Date | null, options?: Intl.DateTimeFormatOptions) {
  const parsed = value instanceof Date ? value : parseTimestamp(value ?? '');
  if (!parsed) return '—';
  return parsed.toLocaleDateString('en-IN', {
    timeZone: IST_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  });
}

export function formatTimeInIST(value?: string | Date | null, options?: Intl.DateTimeFormatOptions) {
  const parsed = value instanceof Date ? value : parseTimestamp(value ?? '');
  if (!parsed) return '—';
  return parsed.toLocaleTimeString('en-IN', {
    timeZone: IST_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options,
  });
}

export function formatScheduleSlotInIST(date?: string, time?: string) {
  const datePart = String(date || '').trim();
  const timePart = String(time || '').trim();
  if (!datePart && !timePart) return '—';
  if (!datePart) return timePart;
  const normalizedTime = timePart
    ? (/^\d{2}:\d{2}$/.test(timePart) ? `${timePart}:00` : timePart)
    : '00:00:00';

  const parsed =
    parseTimestamp(`${datePart}T${normalizedTime}`) ??
    parseTimestamp(`${datePart}, ${timePart || '00:00'}`);
  if (!parsed) return [datePart, timePart].filter(Boolean).join(' · ');
  return `${formatDateInIST(parsed)} · ${formatTimeInIST(parsed)}`;
}

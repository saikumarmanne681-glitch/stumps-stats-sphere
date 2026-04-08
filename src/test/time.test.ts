import { describe, expect, it } from 'vitest';
import { formatScheduleSlotInIST, parseTimestamp } from '@/lib/time';

describe('time utilities', () => {
  it('parses dd/mm/yyyy with time fallback used by schedule slots', () => {
    const parsed = parseTimestamp('08/04/2026, 14:30');
    expect(parsed).not.toBeNull();
    expect(parsed?.toISOString()).toBe('2026-04-08T09:00:00.000Z');
  });

  it('formats schedule slots when time is already in HH:mm:ss', () => {
    const formatted = formatScheduleSlotInIST('2026-04-08', '14:30:00');
    expect(formatted).toContain('08 Apr 2026');
    expect(formatted).toContain('02:30 pm');
  });

  it('returns fallback text when slot cannot be parsed', () => {
    const formatted = formatScheduleSlotInIST('not-a-date', 'not-a-time');
    expect(formatted).toBe('not-a-date · not-a-time');
  });
});

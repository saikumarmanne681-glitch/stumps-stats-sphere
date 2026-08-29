import { describe, expect, it } from 'vitest';
import { createAnnouncementNumber, getAnnouncementNumber } from '@/lib/announcements';

describe('official announcement numbers', () => {
  it('keeps a stored official number unchanged', () => {
    expect(getAnnouncementNumber({ id: 'ANN-2026-0042', date: '2026-08-29' })).toBe('ANN-2026-0042');
  });

  it('uses the next yearly sequence when publishing a notice', () => {
    const number = createAnnouncementNumber([
      { id: 'ANN-2026-0007', date: '2026-05-02' },
      { id: 'ANN-2025-0011', date: '2025-11-01' },
    ], '2026-08-29');

    expect(number).toBe('ANN-2026-0008');
  });
});

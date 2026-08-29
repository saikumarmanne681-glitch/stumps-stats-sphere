import type { Announcement } from './types';

/**
 * Produces the public reference printed on an official announcement. New notices
 * are assigned this value as their id; the fallback keeps older sheet records
 * referenceable without changing them.
 */
export function getAnnouncementNumber(announcement: Pick<Announcement, 'id' | 'date'>): string {
  const id = String(announcement.id || '').trim().toUpperCase();
  if (/^ANN-\d{4}-\d{3,}$/.test(id)) return id;

  const year = String(announcement.date || '').match(/^\d{4}/)?.[0] || '0000';
  const suffix = (id.replace(/[^A-Z0-9]/g, '').slice(-8) || 'UNNUMBERED');
  return `ANN-${year}-${suffix}`;
}

export function createAnnouncementNumber(announcements: Pick<Announcement, 'id' | 'date'>[], date: string): string {
  const year = String(date || new Date().toISOString()).match(/^\d{4}/)?.[0] || new Date().getFullYear();
  const prefix = `ANN-${year}-`;
  const highestSequence = announcements.reduce((highest, announcement) => {
    const match = getAnnouncementNumber(announcement).match(new RegExp(`^${prefix}(\\d+)$`));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${prefix}${String(highestSequence + 1).padStart(4, '0')}`;
}

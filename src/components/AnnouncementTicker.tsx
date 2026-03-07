import { useEffect, useState } from 'react';
import { Announcement } from '@/lib/types';
import { mockAnnouncements } from '@/lib/mockData';

export function AnnouncementTicker() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const active = mockAnnouncements
      .filter(a => a.active)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setAnnouncements(active);
  }, []);

  if (!announcements.length) return null;

  const tickerText = announcements.map(a => `📢 ${a.title}: ${a.message}`).join('   •   ');

  return (
    <div className="bg-primary overflow-hidden py-2">
      <div className="animate-ticker whitespace-nowrap text-primary-foreground font-body text-sm font-medium">
        {tickerText}   •   {tickerText}
      </div>
    </div>
  );
}

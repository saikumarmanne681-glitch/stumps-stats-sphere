import { useData } from '@/lib/DataContext';

export function AnnouncementTicker() {
  const { announcements } = useData();

  const activeAnnouncements = [...announcements]
    .filter(a => a.active)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (activeAnnouncements.length === 0) return null;

  const tickerText = activeAnnouncements.map(a => `📢 ${a.title}: ${a.message}`).join('   •   ');

  return (
    <div className="bg-accent overflow-hidden py-2 relative group">
      <div className="animate-ticker whitespace-nowrap text-accent-foreground font-body text-sm font-medium group-hover:[animation-play-state:paused]">
        {tickerText}   •   {tickerText}
      </div>
    </div>
  );
}

import { useData } from '@/lib/DataContext';
import { Sparkles } from 'lucide-react';

export function AnnouncementTicker() {
  const { announcements } = useData();

  const activeAnnouncements = [...announcements]
    .filter(a => a.active)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (activeAnnouncements.length === 0) return null;

  const tickerText = activeAnnouncements.map(a => `📢 ${a.title}: ${a.message}`).join('   ✦   ');

  return (
    <div className="group relative overflow-hidden py-3 bg-gradient-to-r from-primary via-accent to-primary border-b border-primary/40">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-accent/80 to-primary/90" />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-primary-foreground/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-primary-foreground/10 rounded-full blur-2xl" />
      </div>
      <div className="relative flex items-center">
        <div className="shrink-0 flex items-center gap-1.5 px-4 py-1 bg-primary-foreground/20 backdrop-blur-sm rounded-r-full mr-4 z-10">
          <Sparkles className="h-3.5 w-3.5 text-primary-foreground animate-pulse" />
          <span className="text-primary-foreground font-display text-xs font-bold uppercase tracking-wider">Live</span>
        </div>
        <div className="animate-ticker whitespace-nowrap text-primary-foreground font-body text-sm font-semibold drop-shadow-sm [animation-duration:45s] group-hover:[animation-play-state:paused]">
          {tickerText}   ✦   {tickerText}
        </div>
      </div>
    </div>
  );
}

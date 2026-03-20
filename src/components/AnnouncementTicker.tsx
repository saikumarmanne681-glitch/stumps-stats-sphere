import { useData } from '@/lib/DataContext';
import { Sparkles, Volume2, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function AnnouncementTicker() {
  const { announcements } = useData();

  const activeAnnouncements = [...announcements]
    .filter(a => a.active)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (activeAnnouncements.length === 0) return null;

  const tickerText = activeAnnouncements.map(a => `📢 ${a.title}: ${a.message}`).join('   ✦   ');

  return (
    <div className="group relative overflow-hidden bg-gradient-to-r from-primary via-accent to-primary border-b border-primary/40">
      {/* Animated background particles */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-accent/80 to-primary/90" />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-primary-foreground/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-primary-foreground/10 rounded-full blur-2xl animate-pulse [animation-delay:1s]" />
        <div className="absolute top-1/2 left-1/2 w-20 h-20 bg-primary-foreground/5 rounded-full blur-2xl animate-pulse [animation-delay:2s]" />
      </div>

      {/* Top shimmer line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-foreground/30 to-transparent" />

      <div className="relative flex items-center py-2.5">
        {/* Enhanced tag */}
        <div className="shrink-0 flex items-center gap-1.5 px-4 py-1.5 bg-primary-foreground/20 backdrop-blur-sm rounded-r-full mr-4 z-10 border-r border-primary-foreground/10">
          <div className="relative">
            <Volume2 className="h-3.5 w-3.5 text-primary-foreground" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-primary-foreground rounded-full animate-ping opacity-75" />
          </div>
          <span className="text-primary-foreground font-display text-xs font-bold uppercase tracking-wider">Live</span>
          <Badge className="bg-primary-foreground/20 text-primary-foreground text-[10px] h-4 px-1 border-none">
            {activeAnnouncements.length}
          </Badge>
        </div>

        {/* Ticker content */}
        <div className="animate-ticker whitespace-nowrap text-primary-foreground font-body text-sm font-semibold drop-shadow-sm [animation-duration:40s] group-hover:[animation-play-state:paused]">
          <span className="inline-flex items-center gap-1">
            {tickerText}
            <ChevronRight className="h-3 w-3 inline opacity-50" />
            {tickerText}
          </span>
        </div>
      </div>

      {/* Bottom shimmer line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent" />
    </div>
  );
}

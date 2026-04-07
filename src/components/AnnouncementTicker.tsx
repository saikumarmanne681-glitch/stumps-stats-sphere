import { useMemo } from 'react';
import { useData } from '@/lib/DataContext';
import { Volume2, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatSheetDate } from '@/lib/dataUtils';

export function AnnouncementTicker() {
  const { announcements, loading } = useData();

  const activeAnnouncements = useMemo(() => [...announcements]
    .filter(a => a.active)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [announcements]);

  if (loading && activeAnnouncements.length === 0) {
    return (
      <div className="border-b bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
        Loading announcements…
      </div>
    );
  }

  if (activeAnnouncements.length === 0) return null;

  const tickerText = activeAnnouncements
    .map((a) => {
      const d = formatSheetDate(a.date, 'dd MMM');
      return `📢 ${a.title}: ${a.message} • ${d}`;
    })
    .join('   ✦   ');

  const duration = `${Math.max(24, activeAnnouncements.length * 9)}s`;

  return (
    <div className="group relative overflow-hidden border-b border-primary/30 bg-gradient-to-r from-primary via-primary/90 to-primary">
      {/* subtle shimmer */}
      <div className="absolute inset-0 opacity-15">
        <div className="absolute -left-20 top-0 h-full w-40 bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent animate-pulse" />
      </div>

      <div className="relative flex items-center h-9">
        {/* Live tag */}
        <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 bg-primary-foreground/15 backdrop-blur-sm rounded-r-full mr-3 z-10">
          <div className="relative">
            <Volume2 className="h-3 w-3 text-primary-foreground" />
            <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-primary-foreground rounded-full animate-ping opacity-75" />
          </div>
          <span className="text-primary-foreground font-display text-[10px] font-bold uppercase tracking-wider">Live</span>
          <Badge className="bg-primary-foreground/20 text-primary-foreground text-[9px] h-3.5 px-1 border-none leading-none">
            {activeAnnouncements.length}
          </Badge>
        </div>

        {/* Scrolling text */}
        <div className="flex-1 overflow-hidden">
          <div
            className="animate-ticker whitespace-nowrap text-primary-foreground font-body text-xs font-medium group-hover:[animation-play-state:paused]"
            style={{ animationDuration: duration }}
          >
            {tickerText}
            <span className="mx-8">✦</span>
            {tickerText}
          </div>
        </div>

        {/* Right badges — desktop only */}
        <div className="hidden md:flex shrink-0 items-center gap-1.5 mr-3">
          <Badge className="border-none bg-primary-foreground/12 text-primary-foreground text-[9px] h-5">
            <Shield className="mr-0.5 h-2.5 w-2.5" /> Verified
          </Badge>
        </div>
      </div>
    </div>
  );
}

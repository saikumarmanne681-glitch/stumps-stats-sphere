import { useMemo } from 'react';
import { useData } from '@/lib/DataContext';
import { Sparkles, Volume2, ChevronRight, Shield, PauseCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DataIntegrityBadge } from '@/components/SecurityBadge';
import { formatSheetDate } from '@/lib/dataUtils';

export function AnnouncementTicker() {
  const { announcements, loading } = useData();

  const activeAnnouncements = useMemo(() => [...announcements]
    .filter(a => a.active)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [announcements]);

  if (loading && activeAnnouncements.length === 0) {
    return (
      <div className="border-b bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
        Loading announcements, please wait...
      </div>
    );
  }

  if (activeAnnouncements.length === 0) return null;

  const tickerText = activeAnnouncements
    .map((announcement) => {
      const publishedOn = formatSheetDate(announcement.date, 'dd MMM');
      return `📢 ${announcement.title}: ${announcement.message} • ${publishedOn}`;
    })
    .join('   ✦   ');
  const animationDuration = `${Math.max(24, activeAnnouncements.length * 9)}s`;

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
        <div
          className="animate-ticker whitespace-nowrap text-primary-foreground font-body text-sm font-semibold drop-shadow-sm group-hover:[animation-play-state:paused]"
          style={{ animationDuration }}
        >
          <span className="inline-flex items-center gap-1">
            {tickerText}
            <ChevronRight className="h-3 w-3 inline opacity-50" />
            {tickerText}
          </span>
        </div>

        <div className="ml-auto mr-3 hidden items-center gap-2 md:flex">
          <Badge className="border-none bg-primary-foreground/15 text-primary-foreground text-[10px]">
            <Sparkles className="mr-1 h-3 w-3" /> Priority Feed
          </Badge>
          <Badge className="border-none bg-primary-foreground/15 text-primary-foreground text-[10px]">
            <Shield className="mr-1 h-3 w-3" /> Verified
          </Badge>
          <Badge className="border-none bg-primary-foreground/15 text-primary-foreground text-[10px]">
            <PauseCircle className="mr-1 h-3 w-3" /> Hover to pause
          </Badge>
          <DataIntegrityBadge
            data={activeAnnouncements.map((announcement) => `${announcement.id}:${announcement.date}`).join('|')}
            label="Announcement stream hash"
          />
        </div>
      </div>

      {/* Bottom shimmer line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent" />
    </div>
  );
}

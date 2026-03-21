import { useMemo } from 'react';
import { useData } from '@/lib/DataContext';
import { Sparkles, Volume2, ChevronRight, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DataIntegrityBadge } from '@/components/SecurityBadge';

export function AnnouncementTicker() {
  const { announcements, loading } = useData();

  const activeAnnouncements = useMemo(() => [...announcements]
    .filter(a => a.active)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [announcements]);

  if (loading && activeAnnouncements.length === 0) {
    return (
      <div className="border-b border-border/40 bg-muted/50 px-4 py-2 text-sm text-muted-foreground backdrop-blur-xl">
        Loading announcements, please wait...
      </div>
    );
  }

  if (activeAnnouncements.length === 0) return null;

  const tickerText = activeAnnouncements.map(a => `📢 ${a.title}: ${a.message}`).join('   ✦   ');

  return (
    <div className="group relative overflow-hidden border-b border-primary/10 bg-gradient-to-r from-primary/5 via-card/90 to-secondary/5">
      <div className="relative mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <div className="shrink-0 flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
          <Volume2 className="h-3.5 w-3.5" />
          Live
          <Badge className="h-4 border-none bg-secondary/20 px-1.5 text-[10px] text-secondary-foreground shadow-none">
            {activeAnnouncements.length}
          </Badge>
        </div>

        <div className="animate-ticker whitespace-nowrap text-sm font-medium text-foreground/75 [animation-duration:44s] group-hover:[animation-play-state:paused]">
          <span className="inline-flex items-center gap-1.5">
            {tickerText}
            <ChevronRight className="h-3 w-3 inline opacity-40" />
            {tickerText}
          </span>
        </div>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Badge className="border-none bg-primary/10 text-[10px] text-primary shadow-none">
            <Sparkles className="mr-1 h-3 w-3" /> Curated
          </Badge>
          <Badge className="border-none bg-primary/8 text-[10px] text-primary shadow-none">
            <Shield className="mr-1 h-3 w-3" /> Verified
          </Badge>
          <DataIntegrityBadge
            data={activeAnnouncements.map((a) => `${a.id}:${a.date}`).join('|')}
            label="Announcement stream hash"
          />
        </div>
      </div>
    </div>
  );
}

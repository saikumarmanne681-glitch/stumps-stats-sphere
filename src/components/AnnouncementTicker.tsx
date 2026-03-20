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
      <div className="border-b border-white/50 bg-white/60 px-4 py-2 text-sm text-muted-foreground backdrop-blur-xl">
        Loading announcements, please wait...
      </div>
    );
  }

  if (activeAnnouncements.length === 0) return null;

  const tickerText = activeAnnouncements.map(a => `📢 ${a.title}: ${a.message}`).join('   ✦   ');

  return (
    <div className="group relative overflow-hidden border-b border-primary/10 bg-[linear-gradient(90deg,rgba(239,246,255,0.95),rgba(255,255,255,0.92),rgba(248,250,252,0.95))]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(59,130,246,0.12),transparent_28%),radial-gradient(circle_at_right,rgba(125,211,252,0.14),transparent_30%)]" />

      <div className="relative mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <div className="shrink-0 flex items-center gap-1.5 rounded-full border border-primary/10 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary shadow-sm">
          <Volume2 className="h-3.5 w-3.5" />
          Live feed
          <Badge className="h-4 border-none bg-primary/10 px-1.5 text-[10px] text-primary shadow-none">
            {activeAnnouncements.length}
          </Badge>
        </div>

        <div className="animate-ticker whitespace-nowrap text-sm font-medium text-foreground/80 [animation-duration:44s] group-hover:[animation-play-state:paused]">
          <span className="inline-flex items-center gap-1.5">
            {tickerText}
            <ChevronRight className="h-3 w-3 inline opacity-40" />
            {tickerText}
          </span>
        </div>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Badge className="border-none bg-primary/8 text-[10px] text-primary shadow-none">
            <Sparkles className="mr-1 h-3 w-3" /> Curated
          </Badge>
          <Badge className="border-none bg-emerald-500/10 text-[10px] text-emerald-700 shadow-none">
            <Shield className="mr-1 h-3 w-3" /> Verified
          </Badge>
          <DataIntegrityBadge
            data={activeAnnouncements.map((announcement) => `${announcement.id}:${announcement.date}`).join('|')}
            label="Announcement stream hash"
          />
        </div>
      </div>
    </div>
  );
}

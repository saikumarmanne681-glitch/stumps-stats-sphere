import { useMemo } from 'react';
import { useData } from '@/lib/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatSheetDate } from '@/lib/dataUtils';
import { Newspaper, PauseCircle, CalendarDays, Megaphone } from 'lucide-react';

export function VerticalAnnouncementsBox() {
  const { announcements } = useData();

  const activeAnnouncements = useMemo(
    () =>
      [...announcements]
        .filter((item) => item.active)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [announcements],
  );

  if (activeAnnouncements.length === 0) return null;

  const duration = `${Math.max(40, activeAnnouncements.length * 12)}s`;

  return (
    <Card className="overflow-hidden border-primary/15 bg-gradient-surface shadow-soft animate-rise-in">
      <CardHeader className="border-b border-primary/10 pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 font-display text-base sm:text-lg">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
              <Newspaper className="h-4 w-4" />
            </span>
            Announcements Feed
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[11px]">
              {activeAnnouncements.length} active
            </Badge>
            <Badge variant="soft" className="text-[10px]">
              <PauseCircle className="mr-1 h-3 w-3" /> Hover pauses
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4">
        <div className="relative max-h-72 overflow-hidden rounded-xl border border-primary/10 bg-card/70 p-3 [mask-image:linear-gradient(to_bottom,transparent,black_6%,black_94%,transparent)]">
          <div
            className="animate-vertical-news space-y-3 hover:[animation-play-state:paused]"
            style={{ animationDuration: duration }}
          >
            {[...activeAnnouncements, ...activeAnnouncements].map((item, index) => {
              const isLatest = index % activeAnnouncements.length === 0;
              return (
                <div
                  key={`${item.id}-${index}`}
                  className="group relative overflow-hidden rounded-xl border border-primary/10 bg-card/90 p-3 pl-4 shadow-soft transition-all hover:border-accent/50 hover:shadow-elegant"
                >
                  <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-accent" />
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex items-center gap-1.5 font-display text-sm font-bold text-foreground">
                      <Megaphone className="h-3.5 w-3.5 shrink-0 text-primary" />
                      {item.title}
                    </p>
                    {isLatest && (
                      <Badge className="h-5 shrink-0 border-none bg-accent text-[10px] font-bold text-accent-foreground">
                        Latest
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.message}</p>
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/8 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary">
                    <CalendarDays className="h-3 w-3" />
                    {formatSheetDate(item.date, 'dd MMM yyyy', item.date)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

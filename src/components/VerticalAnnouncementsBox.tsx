import { useMemo } from 'react';
import { useData } from '@/lib/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatSheetDate } from '@/lib/dataUtils';
import { Newspaper, PauseCircle, CalendarDays, Megaphone, Radio } from 'lucide-react';

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

  const duration = `${Math.max(45, activeAnnouncements.length * 14)}s`;

  return (
    <Card className="relative overflow-hidden border-primary/15 bg-gradient-surface shadow-elegant animate-rise-in">
      {/* ambient glows */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-accent/15 blur-3xl" />

      <CardHeader className="relative border-b border-primary/10 pb-3">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2.5 font-display text-base sm:text-lg">
            <span className="relative grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-soft">
              <Newspaper className="h-4 w-4" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-card" />
            </span>
            <span className="flex flex-col leading-tight">
              Announcements Feed
              <span className="font-body text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Official notices
              </span>
            </span>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="gap-1.5 border-none bg-primary/10 text-[11px] font-bold text-primary">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              {activeAnnouncements.length} active
            </Badge>
            <Badge variant="soft" className="hidden gap-1 text-[10px] sm:inline-flex">
              <PauseCircle className="h-3 w-3" /> Hover pauses
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative p-3 sm:p-4">
        <div className="relative max-h-80 overflow-hidden rounded-2xl border border-primary/10 bg-card/60 p-3 backdrop-blur-sm [mask-image:linear-gradient(to_bottom,transparent,black_7%,black_93%,transparent)]">
          {/* timeline rail */}
          <span className="pointer-events-none absolute inset-y-3 left-[1.35rem] w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
          <div
            className="animate-vertical-news space-y-3 hover:[animation-play-state:paused]"
            style={{ animationDuration: duration }}
          >
            {[...activeAnnouncements, ...activeAnnouncements].map((item, index) => {
              const isLatest = index % activeAnnouncements.length === 0;
              return (
                <div
                  key={`${item.id}-${index}`}
                  className="group relative flex gap-3 overflow-hidden rounded-2xl border border-primary/10 bg-card/90 p-3 pl-3 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-elegant"
                >
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/15 to-accent/20 text-primary ring-2 ring-card">
                    {isLatest ? <Radio className="h-3 w-3" /> : <Megaphone className="h-3 w-3" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-display text-sm font-bold text-foreground group-hover:text-primary">
                        {item.title}
                      </p>
                      {isLatest && (
                        <Badge className="h-5 shrink-0 border-none bg-accent text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
                          Latest
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                      {item.message}
                    </p>
                    <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-primary/10 bg-primary/8 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary">
                      <CalendarDays className="h-3 w-3" />
                      {formatSheetDate(item.date, 'dd MMM yyyy', item.date)}
                    </p>
                  </div>
                  <span className="pointer-events-none absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-primary/0 via-accent/60 to-primary/0 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

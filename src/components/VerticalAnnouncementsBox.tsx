import { useMemo } from 'react';
import { useData } from '@/lib/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatSheetDate } from '@/lib/dataUtils';
import { Newspaper, PauseCircle } from 'lucide-react';

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

  return (
    <Card className="border-primary/15 bg-gradient-surface shadow-soft animate-rise-in">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 font-display text-base sm:text-lg">
            <Newspaper className="h-5 w-5 text-primary" />
            All Announcements (Vertical Feed)
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
      <CardContent>
        <div className="max-h-64 overflow-hidden rounded-xl border border-primary/15 bg-card/70 p-3">
          <div className="space-y-3 animate-vertical-news [animation-duration:28s] hover:[animation-play-state:paused]">
            {[...activeAnnouncements, ...activeAnnouncements].map((item, index) => (
              <div key={`${item.id}-${index}`} className="rounded-lg border border-primary/10 bg-card/85 p-3 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{item.title}</p>
                  {index < activeAnnouncements.length && (
                    <Badge variant="soft" className="h-5 text-[10px]">
                      Latest
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.message}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {formatSheetDate(item.date, 'dd MMM yyyy', item.date)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

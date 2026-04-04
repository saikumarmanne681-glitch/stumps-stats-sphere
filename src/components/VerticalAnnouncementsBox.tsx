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
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/10 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <Newspaper className="h-5 w-5 text-primary" />
            All Announcements (Vertical Feed)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[11px]">
              {activeAnnouncements.length} active
            </Badge>
            <Badge className="border-none bg-primary/10 text-[10px] text-primary">
              <PauseCircle className="mr-1 h-3 w-3" /> Hover pauses
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-64 overflow-hidden rounded-xl border border-primary/15 bg-background/70 p-3">
          <div className="space-y-3 animate-vertical-news [animation-duration:28s] hover:[animation-play-state:paused]">
            {[...activeAnnouncements, ...activeAnnouncements].map((item, index) => (
              <div key={`${item.id}-${index}`} className="rounded-lg border border-primary/10 bg-background/80 p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{item.title}</p>
                  {index < activeAnnouncements.length && (
                    <Badge className="h-5 border-none bg-primary/10 text-[10px] text-primary">
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

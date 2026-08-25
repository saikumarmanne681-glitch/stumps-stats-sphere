import { useMemo } from 'react';
import { useData } from '@/lib/DataContext';
import { Radio, CalendarDays, Shield } from 'lucide-react';
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

  const duration = `${Math.max(28, activeAnnouncements.length * 12)}s`;

  const Item = ({ a, i }: { a: typeof activeAnnouncements[number]; i: number }) => (
    <span className="mr-3 inline-flex shrink-0 items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 py-1 pl-2 pr-3 align-middle backdrop-blur-sm">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
        {i + 1}
      </span>
      <span className="font-display text-[11px] font-bold uppercase tracking-wide text-accent sm:text-xs">
        {a.title}
      </span>
      <span className="h-3 w-px bg-primary-foreground/30" />
      <span className="font-body text-[11px] font-medium text-primary-foreground/95 sm:text-xs">
        {a.message}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/15 px-2 py-0.5 font-body text-[10px] font-semibold tabular-nums text-primary-foreground">
        <CalendarDays className="h-2.5 w-2.5" />
        {formatSheetDate(a.date, 'dd MMM yyyy')}
      </span>
    </span>
  );

  const track = (keyPrefix: string) => (
    <>
      {activeAnnouncements.map((a, i) => (
        <Item key={`${keyPrefix}-${a.id ?? i}`} a={a} i={i} />
      ))}
    </>
  );

  return (
    <div className="group relative overflow-hidden border-b border-accent/40 bg-gradient-to-r from-primary via-primary/85 to-primary shadow-sm">
      {/* stadium stripe texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(115deg, hsl(var(--primary-foreground)) 0 10px, transparent 10px 26px)',
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />

      <div className="relative flex h-11 items-center">
        {/* Live badge */}
        <div className="z-10 mr-3 flex shrink-0 items-center gap-2 rounded-r-full bg-accent px-3 py-1.5 shadow-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-foreground/70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-foreground" />
          </span>
          <Radio className="hidden h-3.5 w-3.5 text-accent-foreground sm:block" />
          <span className="font-display text-[10px] font-extrabold uppercase tracking-[0.18em] text-accent-foreground">
            Live
          </span>
          <span className="rounded-full bg-accent-foreground/15 px-1.5 py-px font-body text-[10px] font-bold tabular-nums text-accent-foreground">
            {activeAnnouncements.length}
          </span>
        </div>

        {/* Scrolling items */}
        <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_2%,black_98%,transparent)]">
          <div
            className="animate-ticker flex w-max items-center whitespace-nowrap group-hover:[animation-play-state:paused]"
            style={{ animationDuration: duration }}
          >
            {track('a')}
            {track('b')}
          </div>
        </div>

        {/* Verified — desktop only */}
        <div className="mr-3 hidden shrink-0 items-center md:flex">
          <span className="inline-flex items-center gap-1 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-2 py-1 font-body text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
            <Shield className="h-3 w-3 text-accent" /> Official
          </span>
        </div>
      </div>
    </div>
  );
}

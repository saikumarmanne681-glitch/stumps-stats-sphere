import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function Shell({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('shimmer-surface section-shell animate-fade-in', className)} aria-hidden="true">
      {children}
    </div>
  );
}

/** Table skeleton that mirrors a leaderboard / standings table layout. */
export function LeaderboardTableSkeleton({ rows = 8, cols = 8 }: { rows?: number; cols?: number }) {
  return (
    <Shell className="!p-0 overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border/70 p-4">
        <Skeleton className="h-9 w-9 rounded-2xl" />
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="grid gap-2 border-b border-border/70 bg-muted/40 p-4" style={{ gridTemplateColumns: `2.5rem 1.6fr repeat(${Math.max(cols - 2, 1)}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className="h-3 w-full max-w-[3.5rem]" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid items-center gap-2 border-b border-border/50 p-4 last:border-b-0"
          style={{ gridTemplateColumns: `2.5rem 1.6fr repeat(${Math.max(cols - 2, 1)}, minmax(0, 1fr))` }}
        >
          <Skeleton className="h-4 w-5" />
          <Skeleton className="h-4 w-3/4" />
          {Array.from({ length: Math.max(cols - 2, 1) }).map((_, c) => (
            <Skeleton key={c} className="h-4 w-10" />
          ))}
        </div>
      ))}
    </Shell>
  );
}

/** Match card grid skeleton. */
export function MatchGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="shimmer-surface overflow-hidden rounded-3xl border border-primary/10 bg-gradient-surface p-4 shadow-soft animate-rise-in"
          style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
        >
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Home page skeleton: leaderboards block + matches grid. */
export function HomeSkeleton() {
  return (
    <div className="space-y-10" role="status" aria-live="polite" aria-label="Loading home page content">
      <Shell>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Skeleton className="h-7 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-32 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
        <div className="mb-5 grid gap-3 rounded-2xl border border-primary/10 bg-card/80 p-4 lg:grid-cols-3">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <LeaderboardTableSkeleton rows={5} cols={5} />
          <LeaderboardTableSkeleton rows={5} cols={5} />
        </div>
      </Shell>

      <Shell>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-10 w-full max-w-xs rounded-xl" />
        </div>
        <MatchGridSkeleton />
      </Shell>
    </div>
  );
}

/** Match detail page skeleton: header band, score tiles, scorecard table. */
export function MatchPageSkeleton() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-8" role="status" aria-live="polite" aria-label="Loading match details">
      <Shell>
        <div className="flex flex-col items-center gap-3 text-center">
          <Skeleton className="h-5 w-32 rounded-full" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="stat-tile space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </Shell>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="stat-tile shimmer-surface space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
      <LeaderboardTableSkeleton rows={7} cols={7} />
      <LeaderboardTableSkeleton rows={5} cols={6} />
    </div>
  );
}

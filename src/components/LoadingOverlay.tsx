import { Loader2, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function LoadingOrb({ delay = 0, className = '' }: { delay?: number; className?: string }) {
  return (
    <span
      className={cn('h-3 w-3 rounded-full bg-primary/70 shadow-[0_0_20px_rgba(34,197,94,0.35)] animate-bounce', className)}
      style={{ animationDelay: `${delay}ms`, animationDuration: '1.1s' }}
    />
  );
}

/** Full page loading spinner */
export function PageLoader({ message = 'Loading, please wait...' }: { message?: string }) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-primary/15 bg-gradient-to-br from-primary/10 via-background to-accent/10 px-6 py-20 text-center shadow-[0_20px_80px_-40px_rgba(15,23,42,0.45)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.45),transparent_45%)]" />
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-primary/20 bg-background/80 shadow-2xl backdrop-blur">
        <span className="absolute inset-2 rounded-full border border-dashed border-primary/30 animate-spin" />
        <span className="absolute inset-5 rounded-full border border-accent/40 animate-pulse" />
        <Sparkles className="h-8 w-8 text-accent" />
      </div>
      <div className="relative flex items-center gap-2">
        <LoadingOrb delay={0} />
        <LoadingOrb delay={120} className="bg-accent/80 shadow-[0_0_20px_rgba(251,191,36,0.35)]" />
        <LoadingOrb delay={240} />
      </div>
      <p className="relative mt-5 text-lg font-semibold text-foreground">Preparing your cricket workspace</p>
      <p className="relative mt-2 max-w-md text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/** Card skeleton placeholder */
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-card via-card to-primary/5 p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-8 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Table skeleton */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-primary/10 bg-card shadow-sm">
      <div className="grid gap-0">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="grid gap-4 border-t p-4 first:border-t-0" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={cn('h-4', r === 0 ? 'w-20' : c === 0 ? 'w-24' : 'w-16')} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Inline loading indicator for actions */
export function ActionLoader({ text = 'Processing...' }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-sm text-muted-foreground shadow-sm">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
      <span>{text}</span>
    </span>
  );
}

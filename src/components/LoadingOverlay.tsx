import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Animated cricket-ball orbit loader */
export function OrbitLoader({ size = 96, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={cn('relative', className)} style={{ height: size, width: size }} aria-hidden>
      <span className="absolute inset-0 rounded-full border-2 border-dashed border-primary/25 animate-spin-slow" />
      <span className="absolute inset-3 rounded-full border border-gold/40 animate-[spin_2.4s_linear_infinite_reverse]" />
      <span className="absolute inset-0 rounded-full bg-primary/10 blur-xl" />
      <span className="absolute left-1/2 top-1/2 h-1/3 w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-primary shadow-glow animate-float" />
      <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-gradient-gold shadow-gold" />
    </div>
  );
}

/** Full page loading spinner */
export function PageLoader({ message = 'Loading, please wait...' }: { message?: string }) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-primary/12 bg-gradient-surface px-6 py-20 text-center shadow-elevated animate-fade-in">
      <div className="absolute inset-0 soft-dot-grid opacity-60" />
      <OrbitLoader className="relative" />
      <div className="relative mt-6 flex items-center gap-1.5">
        {[0, 140, 280].map((delay) => (
          <span
            key={delay}
            className="h-2 w-2 rounded-full bg-primary/70 animate-bounce"
            style={{ animationDelay: `${delay}ms`, animationDuration: '1.1s' }}
          />
        ))}
      </div>
      <p className="relative mt-5 font-display text-lg font-bold text-foreground">Preparing your cricket workspace</p>
      <p className="relative mt-2 max-w-md text-sm text-muted-foreground">{message}</p>
      <div className="relative mt-6 h-1.5 w-56 overflow-hidden rounded-full bg-primary/10">
        <span className="block h-full w-1/3 rounded-full bg-gradient-gold" style={{ animation: 'loading-bar 1.4s ease-in-out infinite' }} />
      </div>
    </div>
  );
}

/** Slim top progress bar for route transitions */
export function TopProgressBar() {
  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-1 overflow-hidden bg-primary/10">
      <span className="block h-full w-1/3 rounded-full bg-gradient-primary" style={{ animation: 'loading-bar 1.1s ease-in-out infinite' }} />
    </div>
  );
}

/** Card skeleton placeholder */
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="shimmer-surface overflow-hidden rounded-3xl border border-primary/10 bg-gradient-surface p-4 shadow-soft animate-rise-in"
          style={{ animationDelay: `${i * 70}ms` }}
        >
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
    <div className="shimmer-surface overflow-hidden rounded-3xl border border-primary/10 bg-card shadow-soft">
      <div className="grid gap-0">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="grid gap-4 border-t border-border/70 p-4 first:border-t-0" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
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
    <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-sm text-muted-foreground shadow-soft">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
      <span>{text}</span>
    </span>
  );
}

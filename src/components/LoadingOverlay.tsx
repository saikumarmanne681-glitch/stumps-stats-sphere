import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

/** Full page loading spinner */
export function PageLoader({ message = 'Loading, please wait...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
}

/** Card skeleton placeholder */
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** Table skeleton */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border">
      <div className="grid gap-0">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className={`grid grid-cols-${cols} gap-4 p-3 ${r === 0 ? 'bg-muted/50' : 'border-t'}`}>
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={`h-4 ${r === 0 ? 'w-20' : c === 0 ? 'w-24' : 'w-16'}`} />
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
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      <span className="animate-pulse">{text}</span>
    </span>
  );
}

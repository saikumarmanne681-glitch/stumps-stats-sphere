import { Loader2 } from 'lucide-react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';

export function GlobalActivityIndicator() {
  const activeFetches = useIsFetching();
  const activeMutations = useIsMutating();
  const activeTasks = activeFetches + activeMutations;

  if (!activeTasks) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[120]"
      role="status"
      aria-live="polite"
    >
      <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/95 px-4 py-2 text-xs font-medium text-muted-foreground shadow-xl backdrop-blur-sm">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />
        <span>
          {activeMutations > 0 ? 'Saving updates...' : 'Loading latest data...'} ({activeTasks})
        </span>
      </div>
    </div>
  );
}

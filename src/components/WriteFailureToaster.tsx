import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { retryQueuedWrites } from '@/lib/googleSheets';
import { getQueuedWrites, subscribeToWriteFailures, type WriteFailureDetail } from '@/lib/writeQueue';

const reasonCopy: Record<WriteFailureDetail['reason'], string> = {
  offline: 'You appear to be offline. The change is saved locally and will sync automatically.',
  rejected: 'The server rejected the save. Your change is queued — retry to send it again.',
  network: 'The save could not reach the server. Your change is queued — retry to send it again.',
};

/**
 * Surfaces every failed sheet write as a toast with an inline retry action,
 * so writes are never silently queued without the user knowing.
 */
export function WriteFailureToaster() {
  const { toast } = useToast();
  const lastShown = useRef(0);

  useEffect(
    () =>
      subscribeToWriteFailures((detail) => {
        // Coalesce bursts (e.g. a scorecard save fanning out over many rows).
        const now = Date.now();
        if (now - lastShown.current < 1200) return;
        lastShown.current = now;

        toast({
          variant: 'destructive',
          title: `Couldn't save to ${detail.sheet}`,
          description: reasonCopy[detail.reason],
          action: (
            <ToastAction
              altText="Retry saving pending changes"
              onClick={async () => {
                const synced = await retryQueuedWrites();
                const remaining = getQueuedWrites().length;
                toast(
                  remaining === 0
                    ? { title: 'All changes saved', description: `${synced} pending change${synced === 1 ? '' : 's'} synced successfully.` }
                    : {
                        variant: 'destructive',
                        title: 'Still pending',
                        description: `${remaining} change${remaining === 1 ? '' : 's'} could not be saved yet. They will retry when the connection recovers.`,
                      },
                );
              }}
            >
              Retry
            </ToastAction>
          ),
        });
      }),
    [toast],
  );

  return null;
}

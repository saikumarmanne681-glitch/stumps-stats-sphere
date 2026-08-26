import { useEffect, useState } from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';
import { getQueuedWrites, subscribeToQueuedWrites } from '@/lib/writeQueue';
import { retryQueuedWrites } from '@/lib/googleSheets';

export function UnsavedChangesIndicator() {
  const [pending, setPending] = useState(() => getQueuedWrites().length);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => subscribeToQueuedWrites(() => setPending(getQueuedWrites().length)), []);
  useEffect(() => {
    const retry = () => { void retryQueuedWrites(); };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, []);

  if (!pending) return null;
  return (
    <div className="fixed bottom-4 left-4 z-[120] rounded-full border border-amber-500/40 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 shadow-lg" role="status" aria-live="polite">
      <div className="flex items-center gap-2">
        <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{pending} unsaved change{pending === 1 ? '' : 's'}</span>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 underline-offset-2 hover:bg-amber-100 hover:underline disabled:opacity-60"
          disabled={retrying || !navigator.onLine}
          onClick={async () => {
            setRetrying(true);
            await retryQueuedWrites();
            setPending(getQueuedWrites().length);
            setRetrying(false);
          }}
        >
          <RefreshCw className={retrying ? 'h-3 w-3 animate-spin' : 'h-3 w-3'} /> Retry
        </button>
      </div>
    </div>
  );
}

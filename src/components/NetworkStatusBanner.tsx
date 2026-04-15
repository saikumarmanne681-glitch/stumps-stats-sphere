import { useEffect, useState } from 'react';

export function NetworkStatusBanner() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="border-b border-amber-500/50 bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900">
      Network appears offline. Some data may be stale until connectivity returns.
    </div>
  );
}


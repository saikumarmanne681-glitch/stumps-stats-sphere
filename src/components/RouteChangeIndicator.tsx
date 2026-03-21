import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export function RouteChangeIndicator() {
  const location = useLocation();
  const previousPath = useRef(`${location.pathname}${location.search}${location.hash}`);
  const timeoutRef = useRef<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const currentPath = `${location.pathname}${location.search}${location.hash}`;

    if (currentPath === previousPath.current) {
      return;
    }

    previousPath.current = currentPath;
    setVisible(true);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setVisible(false);
      timeoutRef.current = null;
    }, 700);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [location]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 pt-3">
      <div className="h-1 w-full overflow-hidden bg-primary/10">
        <div className="h-full w-1/3 animate-[loading-bar_0.9s_ease-in-out_infinite] rounded-full bg-primary shadow-[0_0_20px_rgba(59,130,246,0.45)]" />
      </div>
      <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/95 px-3 py-1 text-xs text-muted-foreground shadow-lg backdrop-blur-sm">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        <span>Loading view...</span>
      </div>
    </div>
  );
}

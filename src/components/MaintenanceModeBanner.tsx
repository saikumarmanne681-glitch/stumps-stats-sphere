import { useEffect, useState } from 'react';
import { getFeatureFlags } from '@/lib/adminPowerTools';

export const MaintenanceModeBanner = () => {
  const [enabled, setEnabled] = useState(getFeatureFlags().maintenanceMode);

  useEffect(() => {
    const sync = () => setEnabled(getFeatureFlags().maintenanceMode);
    window.addEventListener('feature-flags:changed', sync);
    return () => window.removeEventListener('feature-flags:changed', sync);
  }, []);

  if (!enabled) return null;
  return (
    <div className="bg-amber-500 text-amber-950 text-center text-xs py-2 px-3 font-medium">
      Maintenance mode is active. Some modules may be temporarily unavailable.
    </div>
  );
};

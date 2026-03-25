import { getAppEnvironment, ENV_LABELS, ENV_COLORS, isProduction } from '@/lib/environment';

/**
 * Floating badge showing DEV or QA — hidden in production.
 */
export function EnvironmentBadge() {
  if (isProduction()) return null;

  const env = getAppEnvironment();
  const label = ENV_LABELS[env];
  const { bg, text } = ENV_COLORS[env];

  return (
    <div className={`fixed bottom-3 left-3 z-[9999] px-3 py-1.5 rounded-full text-xs font-bold tracking-wider shadow-lg ${bg} ${text} select-none pointer-events-none`}>
      🔧 {label}
    </div>
  );
}

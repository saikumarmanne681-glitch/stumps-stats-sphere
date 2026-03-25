import { getAppEnvironment, ENV_LABELS, ENV_COLORS, isProduction } from '@/lib/environment';

/**
 * Floating badge that shows the current environment (DEV / QA).
 * Hidden in production so end-users never see it.
 */
export function EnvironmentBadge() {
  if (isProduction()) return null;

  const env = getAppEnvironment();
  const label = ENV_LABELS[env];
  const colors = ENV_COLORS[env];

  return (
    <div
      className={`fixed bottom-3 left-3 z-[9999] px-3 py-1 rounded-full text-xs font-bold tracking-wider shadow-lg border ${colors.bg} ${colors.text} ${colors.border} select-none pointer-events-none animate-pulse`}
    >
      🔧 {label} ENVIRONMENT
    </div>
  );
}

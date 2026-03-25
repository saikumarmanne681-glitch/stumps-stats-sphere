/**
 * Environment configuration for Dev / QA / Production
 *
 * Set the environment via the VITE_APP_ENV build variable:
 *   - "dev"  → Development
 *   - "qa"   → QA / Testing
 *   - (empty or "production") → Production
 *
 * Each environment can have its own Google Apps Script URL
 * via VITE_APPS_SCRIPT_URL_DEV / VITE_APPS_SCRIPT_URL_QA.
 */

export type AppEnvironment = 'dev' | 'qa' | 'production';

export function getAppEnvironment(): AppEnvironment {
  const env = (import.meta.env.VITE_APP_ENV || '').toString().trim().toLowerCase();
  if (env === 'dev' || env === 'development') return 'dev';
  if (env === 'qa' || env === 'test' || env === 'staging') return 'qa';
  return 'production';
}

export function isProduction(): boolean {
  return getAppEnvironment() === 'production';
}

export const ENV_LABELS: Record<AppEnvironment, string> = {
  dev: 'DEV',
  qa: 'QA',
  production: 'PROD',
};

export const ENV_COLORS: Record<AppEnvironment, { bg: string; text: string; border: string }> = {
  dev: { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-500' },
  qa: { bg: 'bg-amber-500', text: 'text-black', border: 'border-amber-400' },
  production: { bg: 'bg-primary', text: 'text-primary-foreground', border: 'border-primary' },
};

/** Returns the per-environment Apps Script URL override (if any). */
export function getEnvAppsScriptUrl(): string | null {
  const env = getAppEnvironment();
  if (env === 'dev') return (import.meta.env.VITE_APPS_SCRIPT_URL_DEV as string) || null;
  if (env === 'qa') return (import.meta.env.VITE_APPS_SCRIPT_URL_QA as string) || null;
  return null;
}

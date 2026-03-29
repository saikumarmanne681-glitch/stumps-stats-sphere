/**
 * Environment detection — fully automatic based on the current URL.
 *
 * Rules:
 *  - hostname contains "dev" or "localhost" → DEV
 *  - hostname contains "qa" or "staging" or "test" → QA
 *  - everything else → PRODUCTION
 *
 * Each environment keeps its own Google Sheets URL in localStorage
 * so they never clash.
 */

export type AppEnvironment = 'dev' | 'qa' | 'production';

function readConfiguredEnvironment(): AppEnvironment | null {
  const fromEnv = String(import.meta.env.VITE_APP_ENV || import.meta.env.MODE || '').toLowerCase().trim();
  if (fromEnv === 'dev' || fromEnv === 'development') return 'dev';
  if (fromEnv === 'qa' || fromEnv === 'test' || fromEnv === 'staging') return 'qa';
  if (fromEnv === 'prod' || fromEnv === 'production') return 'production';
  return null;
}

export function getAppEnvironment(): AppEnvironment {
  const configured = readConfiguredEnvironment();
  if (configured) return configured;
  const host = window.location.hostname.toLowerCase();
  if (host === 'localhost' || host.startsWith('localhost:') || host.startsWith('dev.') || host.includes('.dev.')) return 'dev';
  if (host.startsWith('qa.') || host.includes('.qa.') || host.startsWith('staging.') || host.includes('.staging.') || host.startsWith('test.') || host.includes('.test.')) return 'qa';
  return 'production';
}

export function isProduction(): boolean {
  return getAppEnvironment() === 'production';
}

export const ENV_LABELS: Record<AppEnvironment, string> = {
  dev: 'DEV',
  qa: 'QA',
  production: 'PRODUCTION',
};

export const ENV_COLORS: Record<AppEnvironment, { bg: string; text: string }> = {
  dev: { bg: 'bg-blue-600', text: 'text-white' },
  qa: { bg: 'bg-amber-500', text: 'text-black' },
  production: { bg: 'bg-primary', text: 'text-primary-foreground' },
};

/**
 * Each environment stores its own Apps Script URL in localStorage
 * under a prefixed key so they never overwrite each other.
 */
export function getEnvStorageKey(base: string): string {
  const env = getAppEnvironment();
  if (env === 'production') return base; // backwards-compatible
  return `${base}_${env}`;
}

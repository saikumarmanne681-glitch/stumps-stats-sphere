export type FeatureFlagKey =
  | 'docsPortalV2'
  | 'certificatesV2'
  | 'scorelistRealtime'
  | 'publicWatchPage'
  | 'maintenanceMode';

const STORAGE_KEY = 'admin:feature-flags';

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagKey, boolean> = {
  docsPortalV2: true,
  certificatesV2: true,
  scorelistRealtime: true,
  publicWatchPage: true,
  maintenanceMode: false,
};

export function getFeatureFlags(): Record<FeatureFlagKey, boolean> {
  if (typeof window === 'undefined') return DEFAULT_FEATURE_FLAGS;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...DEFAULT_FEATURE_FLAGS, ...parsed };
  } catch {
    return DEFAULT_FEATURE_FLAGS;
  }
}

export function setFeatureFlag(flag: FeatureFlagKey, value: boolean): Record<FeatureFlagKey, boolean> {
  const next = { ...getFeatureFlags(), [flag]: value };
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('feature-flags:changed', { detail: next }));
  }
  return next;
}

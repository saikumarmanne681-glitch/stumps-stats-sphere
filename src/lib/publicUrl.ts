const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const readConfiguredPublicOrigin = () => {
  const configuredOrigin = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  if (!configuredOrigin) return null;

  try {
    return trimTrailingSlash(new URL(configuredOrigin).toString());
  } catch {
    console.warn('Ignoring invalid VITE_PUBLIC_APP_URL value for public links:', configuredOrigin);
    return null;
  }
};

export const getPublicAppOrigin = () => {
  const configuredOrigin = readConfiguredPublicOrigin();
  if (configuredOrigin) return configuredOrigin;
  return trimTrailingSlash(window.location.origin);
};

export const getPublicVerifyScorelistUrl = (scorelistId: string) => (
  `${getPublicAppOrigin()}/verify-scorelist/${encodeURIComponent(scorelistId)}`
);

export const getPublicVerifyCertificateUrl = (certificateId: string) => (
  `${getPublicAppOrigin()}/verify/certificate/${encodeURIComponent(certificateId)}`
);

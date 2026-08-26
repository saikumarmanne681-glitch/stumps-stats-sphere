import { dehydrate, hydrate, type DehydratedState, type QueryClient } from '@tanstack/react-query';

const STORAGE_KEY = 'stumps-stats-sphere:query-cache:v1';
const MAX_AGE_MS = 24 * 60 * 60_000;

export function restoreQueryCache(client: QueryClient) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as { savedAt?: number; cache?: DehydratedState };
    if (!saved.savedAt || Date.now() - saved.savedAt > MAX_AGE_MS || !saved.cache) return;
    hydrate(client, saved.cache);
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function persistQueryCache(client: QueryClient) {
  let timer: number | undefined;
  return client.getQueryCache().subscribe(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      try {
        // Only successful query data is dehydrated; mutations and credentials never enter browser storage.
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), cache: dehydrate(client) }));
      } catch {
        // Storage can be unavailable/full; network fetching remains the safe fallback.
      }
    }, 500);
  });
}

const inflightRequests = new Map<string, Promise<boolean>>();
const recentOperationTimestamps = new Map<string, number>();

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`;
}

export function createPayloadKey(prefix: string, payload: unknown) {
  return `${prefix}:${stableStringify(payload)}`;
}

export function runSingleFlight(key: string, factory: () => Promise<boolean>) {
  const existing = inflightRequests.get(key);
  if (existing) return existing;
  const promise = factory().finally(() => {
    if (inflightRequests.get(key) === promise) inflightRequests.delete(key);
  });
  inflightRequests.set(key, promise);
  return promise;
}

export function isRecentOperation(key: string, windowMs = 4000) {
  const now = Date.now();
  const last = recentOperationTimestamps.get(key) || 0;
  if (now - last < windowMs) return true;
  recentOperationTimestamps.set(key, now);
  return false;
}

export function clearRecentOperation(key: string) {
  recentOperationTimestamps.delete(key);
}

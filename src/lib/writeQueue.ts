/** Durable, browser-local retry queue for non-destructive Apps Script writes. */
export type QueuedWrite = {
  id: string;
  action: 'add' | 'update' | 'delete';
  sheet: string;
  data: Record<string, unknown>;
  createdAt: string;
  attempts: number;
};

const STORAGE_KEY = 'stumps-stats-sphere:pending-writes:v1';
const CHANGE_EVENT = 'stumps-pending-writes-changed';

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage;
const makeId = () => `write_${Date.now()}_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;

export function getQueuedWrites(): QueuedWrite[] {
  if (!canUseStorage()) return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function persist(items: QueuedWrite[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function queueWrite(write: Omit<QueuedWrite, 'id' | 'createdAt' | 'attempts'>, requestId = makeId()): QueuedWrite {
  // Keep the newest unsaved version of an entity; this prevents stale updates replaying after a newer one.
  const items = getQueuedWrites();
  const key = `${write.sheet}:${String(write.data.id || write.data.player_id || write.data.match_id || write.data.tournament_id || write.data.season_id || '')}`;
  const next = items.filter((item) => `${item.sheet}:${String(item.data.id || item.data.player_id || item.data.match_id || item.data.tournament_id || item.data.season_id || '')}` !== key);
  const queued = { ...write, id: requestId, createdAt: new Date().toISOString(), attempts: 0 };
  persist([...next, queued]);
  return queued;
}

export function removeQueuedWrite(id: string) {
  persist(getQueuedWrites().filter((item) => item.id !== id));
}

export function markQueuedWriteAttempt(id: string) {
  persist(getQueuedWrites().map((item) => item.id === id ? { ...item, attempts: item.attempts + 1 } : item));
}

const FAILURE_EVENT = 'stumps-write-failed';

export type WriteFailureDetail = {
  id: string;
  sheet: string;
  action: QueuedWrite['action'];
  reason: 'offline' | 'rejected' | 'network';
};

/** Announces a failed (but queued) write so the UI can toast it with an inline retry. */
export function emitWriteFailure(detail: WriteFailureDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<WriteFailureDetail>(FAILURE_EVENT, { detail }));
}

export function subscribeToWriteFailures(listener: (detail: WriteFailureDetail) => void) {
  if (typeof window === 'undefined') return () => undefined;
  const handler = (event: Event) => listener((event as CustomEvent<WriteFailureDetail>).detail);
  window.addEventListener(FAILURE_EVENT, handler);
  return () => window.removeEventListener(FAILURE_EVENT, handler);
}

export function subscribeToQueuedWrites(listener: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

import { v2api, istNow } from './v2api';
import { UserPresence } from './v2types';

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let activeUserId = '';
let visibilityHandler: (() => void) | null = null;
let onlineHandler: (() => void) | null = null;

export function startHeartbeat(userId: string) {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  if (typeof document !== 'undefined' && visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
  if (typeof window !== 'undefined' && onlineHandler) window.removeEventListener('online', onlineHandler);
  activeUserId = userId;

  const send = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const deviceType = typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
    // Use ISO timestamp for reliable parsing across timezones
    const now = new Date().toISOString();
    const presence: UserPresence = {
      user_id: userId,
      last_heartbeat: now,
      last_seen: now,
      active_sessions: 1,
      device_type: deviceType,
    };
    // Try update first, if fails (not found) add new
    const ok = await v2api.updatePresence(presence);
    if (!ok) await v2api.addPresence(presence);
  };

  send(); // immediate
  heartbeatInterval = setInterval(send, 30000); // every 30s for better responsiveness

  visibilityHandler = () => {
    if (document.visibilityState === 'visible') void send();
  };
  onlineHandler = () => {
    void send();
  };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', visibilityHandler);
  if (typeof window !== 'undefined') window.addEventListener('online', onlineHandler);
}

export function stopHeartbeat() {
  if (typeof document !== 'undefined' && visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
  if (typeof window !== 'undefined' && onlineHandler) {
    window.removeEventListener('online', onlineHandler);
    onlineHandler = null;
  }
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (activeUserId) {
    const now = new Date().toISOString();
    v2api.updatePresence({
      user_id: activeUserId,
      last_heartbeat: now,
      last_seen: now,
      active_sessions: 0,
      device_type: typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    }).catch(() => undefined);
  }
  activeUserId = '';
}

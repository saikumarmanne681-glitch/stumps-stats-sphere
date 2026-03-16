import { v2api, istNow } from './v2api';
import { UserPresence } from './v2types';

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

export function startHeartbeat(userId: string) {
  if (heartbeatInterval) clearInterval(heartbeatInterval);

  const send = async () => {
    const deviceType = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
    const presence: UserPresence = {
      user_id: userId,
      last_heartbeat: istNow(),
      last_seen: istNow(),
      active_sessions: 1,
      device_type: deviceType,
    };
    // Try update first, if fails (not found) add new
    const ok = await v2api.updatePresence(presence);
    if (!ok) await v2api.addPresence(presence);
  };

  send(); // immediate
  heartbeatInterval = setInterval(send, 60000); // every 60s
}

export function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

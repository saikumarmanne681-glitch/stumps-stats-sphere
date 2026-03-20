import { SupportTicket, SupportMessage, SupportCSAT, UserEmailLink, UserNotificationPreferences, UserPresence, DigitalScorelist, AuditEvent, ManagementUser, MatchTimeline } from './v2types';
import { getAppsScriptUrl } from './googleSheets';

async function fetchV2Sheet<T>(sheet: string): Promise<T[]> {
  const url = getAppsScriptUrl();
  if (!url) return [];
  const res = await fetch(`${url}?action=get&sheet=${sheet}`);
  const data = await res.json();
  return (Array.isArray(data) ? data : []) as T[];
}

async function writeV2Sheet<T>(sheet: string, action: 'add' | 'update' | 'delete', payload: T): Promise<boolean> {
  const url = getAppsScriptUrl();
  if (!url) return false;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action, sheet, data: payload }),
  });
  const result = await res.json();
  return result.success;
}

export const v2api = {
  syncHeaders: async () => {
    const url = getAppsScriptUrl();
    if (!url) return false;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'syncHeaders' }),
    });
    const result = await res.json();
    return !!result.success;
  },
  // Support Tickets
  getTickets: () => fetchV2Sheet<SupportTicket>('SUPPORT_TICKETS'),
  addTicket: (t: SupportTicket) => writeV2Sheet('SUPPORT_TICKETS', 'add', t),
  updateTicket: (t: SupportTicket) => writeV2Sheet('SUPPORT_TICKETS', 'update', t),
  deleteTicket: (id: string) => writeV2Sheet('SUPPORT_TICKETS', 'delete', { ticket_id: id }),

  // Support Messages
  getTicketMessages: () => fetchV2Sheet<SupportMessage>('SUPPORT_MESSAGES'),
  addTicketMessage: (m: SupportMessage) => writeV2Sheet('SUPPORT_MESSAGES', 'add', m),

  // CSAT
  getCSAT: () => fetchV2Sheet<SupportCSAT>('SUPPORT_CSAT'),
  addCSAT: (c: SupportCSAT) => writeV2Sheet('SUPPORT_CSAT', 'add', c),

  // Email Links
  getEmailLinks: () => fetchV2Sheet<UserEmailLink>('USER_EMAIL_LINKS'),
  addEmailLink: (e: UserEmailLink) => writeV2Sheet('USER_EMAIL_LINKS', 'add', e),
  updateEmailLink: (e: UserEmailLink) => writeV2Sheet('USER_EMAIL_LINKS', 'update', e),

  // Notification Prefs
  getNotificationPrefs: () => fetchV2Sheet<UserNotificationPreferences>('USER_NOTIFICATION_PREFERENCES'),
  addNotificationPrefs: (p: UserNotificationPreferences) => writeV2Sheet('USER_NOTIFICATION_PREFERENCES', 'add', p),
  updateNotificationPrefs: (p: UserNotificationPreferences) => writeV2Sheet('USER_NOTIFICATION_PREFERENCES', 'update', p),

  // Presence
  getPresence: () => fetchV2Sheet<UserPresence>('USER_PRESENCE'),
  updatePresence: (p: UserPresence) => writeV2Sheet('USER_PRESENCE', 'update', p),
  addPresence: (p: UserPresence) => writeV2Sheet('USER_PRESENCE', 'add', p),

  // Scorelists
  getScorelists: () => fetchV2Sheet<DigitalScorelist>('DIGITAL_SCORELISTS'),
  addScorelist: (s: DigitalScorelist) => writeV2Sheet('DIGITAL_SCORELISTS', 'add', s),
  updateScorelist: (s: DigitalScorelist) => writeV2Sheet('DIGITAL_SCORELISTS', 'update', s),

  // Audit
  getAuditEvents: () => fetchV2Sheet<AuditEvent>('AUDIT_EVENTS'),
  addAuditEvent: (e: AuditEvent) => writeV2Sheet('AUDIT_EVENTS', 'add', e),

  sendOtpEmail: async (email: string, otp: string) => {
    const url = getAppsScriptUrl();
    if (!url) return { success: false, error: 'Apps Script URL is not configured' };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'sendOtpEmail', data: { email, otp } }),
    });
    return res.json() as Promise<{ success: boolean; error?: string }>;
  },

  // Management Users
  getManagementUsers: () => fetchV2Sheet<ManagementUser>('MANAGEMENT_USERS'),
  addManagementUser: (m: ManagementUser) => writeV2Sheet('MANAGEMENT_USERS', 'add', m),
  updateManagementUser: (m: ManagementUser) => writeV2Sheet('MANAGEMENT_USERS', 'update', m),
  deleteManagementUser: (id: string) => writeV2Sheet('MANAGEMENT_USERS', 'delete', { management_id: id }),

  // Match Timeline
  getMatchTimeline: () => fetchV2Sheet<MatchTimeline>('MATCH_TIMELINE'),
  addTimelineEvent: (e: MatchTimeline) => writeV2Sheet('MATCH_TIMELINE', 'add', e),
  deleteTimelineEvent: (id: string) => writeV2Sheet('MATCH_TIMELINE', 'delete', { event_id: id }),
};

// Helper to create IST timestamp
export function istNow(): string {
  return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

// Audit helper
export function logAudit(actor: string, eventType: string, entityType: string, entityId: string, metadata: string = '') {
  const metadataPayload = (() => {
    const base = {
      clientTimeIso: new Date().toISOString(),
      clientTimeLocale: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().locale : '',
      timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '',
      page: typeof window !== 'undefined' ? window.location.pathname : '',
      query: typeof window !== 'undefined' ? window.location.search : '',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      language: typeof navigator !== 'undefined' ? navigator.language : '',
      platform: typeof navigator !== 'undefined' ? navigator.platform : '',
      details: metadata,
    };
    try {
      const parsed = metadata ? JSON.parse(metadata) : null;
      return JSON.stringify(parsed ? { ...base, details: parsed } : base);
    } catch {
      return JSON.stringify(base);
    }
  })();
  const evt: AuditEvent = {
    event_id: `AUD_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    actor_user: actor,
    event_type: eventType,
    entity_type: entityType,
    entity_id: entityId,
    metadata: metadataPayload,
    timestamp: istNow(),
  };
  v2api.addAuditEvent(evt).catch(console.error);
}

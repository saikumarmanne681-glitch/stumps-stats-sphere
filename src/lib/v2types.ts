// v2.0 Types — New modules only

export interface SupportTicket {
  ticket_id: string;
  created_by_user_id: string;
  category: string;
  priority: "low" | "medium" | "high" | "critical";
  subject: string;
  description: string;
  attachment_url: string;
  status: "open" | "in_progress" | "waiting_for_user" | "resolved" | "closed";
  assigned_admin_id: string;
  created_at: string;
  first_response_due: string;
  resolution_due: string;
  resolved_at: string;
  closed_at: string;
}

export interface SupportMessage {
  message_id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: "admin" | "player";
  message_body: string;
  attachment_url: string;
  is_internal_note: boolean;
  created_at: string;
}

export interface SupportCSAT {
  csat_id: string;
  ticket_id: string;
  rating: number;
  feedback: string;
  submitted_at: string;
}

export interface UserEmailLink {
  user_id: string;
  email: string;
  is_verified: boolean;
  verification_token: string;
  token_expiry: string;
  verified_at: string;
  created_at: string;
}

export interface UserNotificationPreferences {
  user_id: string;
  support_updates: boolean;
  announcements: boolean;
  security_alerts: boolean;
  updated_at: string;
}

export interface UserPresence {
  user_id: string;
  last_heartbeat: string;
  last_seen: string;
  active_sessions: number;
  device_type: string;
}

export interface DigitalScorelist {
  scorelist_id: string;
  season_id: string;
  tournament_id: string;
  match_id: string;
  scope_type: "match" | "tournament" | "season";
  payload_json: string;
  hash_digest: string;
  signature: string;
  generated_by: string;
  generated_at: string;
}

export interface AuditEvent {
  event_id: string;
  actor_user: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  metadata: string;
  timestamp: string;
}

// SLA config
export const SLA_CONFIG = {
  low: { firstResponse: 24, resolution: 72 },
  medium: { firstResponse: 8, resolution: 48 },
  high: { firstResponse: 4, resolution: 24 },
  critical: { firstResponse: 1, resolution: 8 },
} as const;

export function getPresenceStatus(lastHeartbeat?: string) {
  if (!lastHeartbeat) return "offline";

  const time = new Date(lastHeartbeat).getTime();

  if (isNaN(time)) return "offline";

  const diff = Date.now() - time;

  if (diff < 60000) return "online";
  if (diff < 300000) return "away";

  return "offline";
}

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
  certification_status?: string;
  certifications_json?: string;
  locked?: boolean;
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

export interface ManagementUser {
  management_id: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  role: string;
  authority_level: number;
  signature_image: string;
  status: "active" | "inactive";
  created_at: string;
  username: string;
  password: string;
}

export interface MatchTimeline {
  event_id: string;
  match_id: string;
  over: string;
  event_type: string;
  description: string;
  player_id: string;
  team: string;
  timestamp: string;
}

export interface CertificationApproval {
  approver_id: string;
  approver_name: string;
  designation: string;
  timestamp: string;
  token: string;
  stage: string;
}


export interface BoardConfiguration {
  config_id: string;
  current_period: string;
  administration_team_ids: string;
  elections_closed: boolean;
  elections_closed_reason: string;
  tournament_registration_closed: boolean;
  tournament_registration_closed_reason: string;
  updated_at: string;
  updated_by: string;
}

export interface NewsRoomPost {
  post_id: string;
  title: string;
  body: string;
  audience: "all" | "players" | "management";
  status: "published" | "draft";
  posted_by_id: string;
  posted_by_name: string;
  posted_by_role: string;
  published_at: string;
  updated_at: string;
}

export interface CertificateRecord {
  certificate_id: string;
  certificate_type:
    | 'winner_team'
    | 'runner_up_team'
    | 'man_of_tournament_runs'
    | 'man_of_tournament_wickets'
    | 'man_of_tournament_all_round'
    | 'man_of_match';
  title: string;
  season_id: string;
  tournament_id: string;
  match_id: string;
  recipient_type: 'player' | 'team';
  recipient_id: string;
  recipient_name: string;
  metadata_json: string;
  certificate_html: string;
  qr_payload: string;
  security_hash: string;
  approval_status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  approvals_json: string;
  generated_by: string;
  generated_at: string;
  approved_at: string;
  delivery_status: 'not_sent' | 'sent_to_player';
}

export interface OfficialDocumentRecord {
  document_id: string;
  title: string;
  category: string;
  department: string;
  source_url: string;
  source_type: 'url';
  status: 'published' | 'hidden';
  allowed_management_ids: string;
  allow_preview: boolean;
  allow_download: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// SLA config
export const SLA_CONFIG = {
  low: { firstResponse: 24, resolution: 72 },
  medium: { firstResponse: 8, resolution: 48 },
  high: { firstResponse: 4, resolution: 24 },
  critical: { firstResponse: 1, resolution: 8 },
} as const;

export function getPresenceStatus(lastHeartbeat?: string) {
  if (!lastHeartbeat) return "offline" as const;

  // Parse IST locale string format: "17/3/2026, 10:54:26 am"
  let time: number;
  
  // Try parsing as ISO first
  const isoTime = new Date(lastHeartbeat).getTime();
  if (!isNaN(isoTime) && isoTime > 0) {
    time = isoTime;
  } else {
    // Parse Indian locale format: "DD/M/YYYY, HH:MM:SS am/pm"
    const parts = lastHeartbeat.match(/(\d+)\/(\d+)\/(\d+),?\s*(\d+):(\d+):(\d+)\s*(am|pm)?/i);
    if (!parts) return "offline" as const;
    
    let [, day, month, year, hours, minutes, seconds, ampm] = parts;
    let h = parseInt(hours);
    if (ampm) {
      if (ampm.toLowerCase() === 'pm' && h !== 12) h += 12;
      if (ampm.toLowerCase() === 'am' && h === 12) h = 0;
    }
    
    // Create date in IST (UTC+5:30)
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), h, parseInt(minutes), parseInt(seconds));
    // Adjust for IST offset - the date was created in local time but represents IST
    const istOffset = 5.5 * 60; // IST is UTC+5:30
    const localOffset = new Date().getTimezoneOffset(); // negative for east of UTC
    time = d.getTime() - (istOffset + localOffset) * 60 * 1000;
  }

  if (isNaN(time) || time <= 0) return "offline" as const;

  const diff = Date.now() - time;

  if (diff < 90000) return "online" as const;    // 90 seconds
  if (diff < 300000) return "away" as const;      // 5 minutes

  return "offline" as const;
}

export const MATCH_STAGES = [
  'League',
  'Group Stage',
  'Quarter Final',
  'Semi Final',
  'Final',
  'Qualifier',
  'Eliminator',
  'Friendly',
  'Super Over',
  'Play-off',
] as const;

export const MANAGEMENT_ROLES = [
  'President',
  'Vice President',
  'Tournament Director',
  'Election Officer',
  'Match Referee',
  'Scoring Official',
  'Media Manager',
  'Secretary',
  'Treasurer',
] as const;

export const CERTIFICATION_STAGES = [
  'draft',
  'scoring_completed',
  'referee_verified',
  'director_approved',
  'official_certified',
] as const;

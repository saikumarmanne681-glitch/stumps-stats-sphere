// v2.0 Types — New modules only

export interface SupportTicket {
  ticket_id: string;
  created_by_user_id: string;
  category: string;
  priority: "low" | "medium" | "high" | "critical";
  assignee_id?: string;
  due_at?: string;
  escalation_state?: "normal" | "warning" | "breached" | "breached_notified";
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
  assignee_id?: string;
  due_at?: string;
  priority?: "low" | "medium" | "high" | "critical";
  escalation_state?: "normal" | "warning" | "breached" | "breached_notified";
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

export interface MailDiagnostic {
  mail_log_id: string;
  triggered_at: string;
  triggered_by: string;
  trigger_source: string;
  trigger_entity_type: string;
  trigger_entity_id: string;
  recipient: string;
  subject: string;
  body_html: string;
  body_text: string;
  from_email: string;
  reply_to: string;
  mail_provider: string;
  status: 'sent' | 'failed';
  failure_reason: string;
  raw_response: string;
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

export interface ScorecardAtomicAuditDetails {
  operation_id: string;
  match_id: string;
  scorecard_version: number;
  scorecard_checksum: string;
  batting_entries: number;
  bowling_entries: number;
  partial_write?: boolean;
  retry_guidance?: string;
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
  department_assignments_json?: string;
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

export interface TeamProfile {
  team_id: string;
  team_name: string;
  short_name: string;
  captain_name: string;
  coach_name: string;
  home_ground: string;
  founded_year: string;
  primary_color: string;
  secondary_color: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface TeamTitleRecord {
  title_id: string;
  team_id: string;
  team_name: string;
  competition_name: string;
  tournament_id: string;
  season_id: string;
  season_label: string;
  result_type: 'winner' | 'runner_up';
  won_on: string;
  notes: string;
  created_at: string;
}

export interface TeamAccessUser {
  team_access_id: string;
  team_id: string;
  team_name: string;
  username: string;
  password: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  linked_by_admin: string;
}


export interface CertificateRecord {
  id: string;
  type: string;
  tournament: string;
  season: string;
  match_id: string;
  recipient_type: 'player' | 'team';
  recipient_id: string;
  recipient_name: string;
  linked_player_id?: string;
  linked_team_name?: string;
  template_id: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'REJECTED' | 'APPROVED' | 'CERTIFIED';
  created_by: string;
  created_at: string;
  details_json?: string;
  performance_json?: string;
  verification_code?: string;
  certified_at?: string;
  certified_by?: string;
}

export interface CertificateApprovalRecord {
  certificate_id: string;
  role: 'treasurer' | 'referee' | 'tournament_director';
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string;
  approved_at: string;
  remarks?: string;
}

export interface CertificateTemplateRecord {
  template_id: string;
  type: string;
  template_name: string;
  image_url: string;
  design_config: string;
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


export type DynamicFormFieldType =
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'time'
  | 'datetime'
  | 'checkbox'
  | 'select'
  | 'radio'
  | 'multi_select';

export interface DynamicFormCondition {
  field_key: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty';
  value: string;
}

export interface DynamicFormFieldOption {
  label: string;
  value: string;
}

export interface DynamicFormField {
  key: string;
  type: DynamicFormFieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  help_text?: string;
  default_value?: string;
  options?: DynamicFormFieldOption[];
  conditions?: DynamicFormCondition[];
}

export interface DynamicFormDefinition {
  form_id: string;
  title: string;
  slug: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  audience: 'players' | 'teams' | 'management' | 'all_logged_in';
  schema_json: string;
  settings_json: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface DynamicFormEntry {
  entry_id: string;
  form_id: string;
  form_title: string;
  submitted_by_id: string;
  submitted_by_name: string;
  submitted_by_role: string;
  payload_json: string;
  status: 'pending' | 'accepted' | 'rejected';
  notes: string;
  submitted_at: string;
  reviewed_at: string;
  reviewed_by: string;
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

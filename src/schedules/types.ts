export type ScheduleStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';

export type ScheduleFormat = 'round_robin' | 'double_round_robin' | 'single_elimination' | 'double_elimination';

export interface ScheduleGenerationPolicy {
  format: ScheduleFormat;
  start_date: string;
  end_date: string;
  matches_per_day: number;
  match_times: string[];
  allow_same_day_multiple_matches: boolean;
  allow_consecutive_days: boolean;
  venues: string[];
  selected_teams: string[];
}

export interface ScheduleRecord {
  schedule_id: string;
  tournament_id: string;
  tournament_name: string;
  version_number: number;
  matches_json: string;
  created_by: string;
  created_by_name: string;
  timestamp: string;
  change_log: string;
  status: ScheduleStatus;
  parent_schedule_id: string;
  hash: string;
  rejection_reason: string;
  generation_policy_json?: string;
  certification_note?: string;
  certified_by?: string;
  certified_by_name?: string;
  certified_at?: string;
  assignee_id?: string;
  due_at?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  escalation_state?: 'normal' | 'warning' | 'breached' | 'breached_notified';
}

export interface ScheduleApprovalRecord {
  approval_id: string;
  schedule_id: string;
  approver_id: string;
  approver_name: string;
  approver_role: string;
  decision: 'approved' | 'rejected';
  comments: string;
  timestamp: string;
}

export interface ScheduleMatch {
  match_id: string;
  date: string;
  time: string;
  venue: string;
  team_a: string;
  team_b: string;
  stage: string;
  notes: string;
}

export interface ScheduleDiffEntry {
  kind: 'added' | 'updated' | 'removed';
  match_id: string;
  previous?: ScheduleMatch;
  current?: ScheduleMatch;
}

export interface ScheduleAuditLog {
  audit_id: string;
  module: 'schedules';
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string;
  actor_name: string;
  timestamp: string;
  details: string;
}

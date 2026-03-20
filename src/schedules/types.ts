export type ScheduleStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';

export interface ScheduleRecord {
  schedule_id: string;
  tournament_id: string;
  tournament_name: string;
  season_id?: string;
  season_label?: string;
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

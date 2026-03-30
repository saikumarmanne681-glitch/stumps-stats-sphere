export type ElectionStatus = 'draft' | 'open' | 'closed' | 'archived';
export type NominationStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'withdrawn';

export interface ElectionRecord {
  election_id: string;
  title: string;
  description: string;
  roles_json: string;
  eligible_roles_json: string;
  status: ElectionStatus;
  notification_date: string;
  nomination_start: string;
  nomination_end: string;
  withdrawal_deadline: string;
  scrutiny_date: string;
  voting_start: string;
  voting_end: string;
  results_day: string;
  created_by: string;
  created_at: string;
  results_published_at: string;
  show_notice: boolean;
  enable_nominations: boolean;
  enable_status_tracking: boolean;
  publish_candidate_list: boolean;
  enable_voting: boolean;
  close_polling: boolean;
  publish_results: boolean;
  archive_election: boolean;
}

export interface NominationRecord {
  nomination_id: string;
  election_id: string;
  role_name: string;
  nominee_user_id: string;
  nominee_name: string;
  player_id: string;
  proposer_user_id: string;
  proposer_name: string;
  seconder_name: string;
  manifesto: string;
  declaration_accepted: boolean;
  status: NominationStatus;
  remarks: string;
  reviewed_by: string;
  reviewed_at: string;
  created_at: string;
}

export interface VoteRecord {
  vote_id: string;
  election_id: string;
  role_name: string;
  voter_user_id: string;
  voter_name: string;
  nominee_user_id: string;
  nominee_name: string;
  submitted_at: string;
  immutable_hash: string;
}

export interface ElectionTermRecord {
  assignment_id: string;
  election_id: string;
  role_name: string;
  user_id: string;
  user_name: string;
  term_start: string;
  term_end: string;
  assigned_at: string;
  source_vote_count: number;
}

export interface ElectionAuditLog {
  audit_id: string;
  module: 'elections';
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string;
  actor_name: string;
  timestamp: string;
  details: string;
}

export interface ElectionResultSummary {
  role_name: string;
  total_votes: number;
  winner_user_id: string;
  winner_name: string;
  nominees: Array<{
    nominee_user_id: string;
    nominee_name: string;
    votes: number;
  }>;
}

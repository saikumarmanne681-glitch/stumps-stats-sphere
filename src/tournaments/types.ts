export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface TournamentRegistryRecord {
  tournament_id: string;
  name: string;
  format: string;
  venue: string;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  created_by: string;
  created_at: string;
  status: 'open' | 'closed';
  notes: string;
}

export interface RegistrationRecord {
  registration_id: string;
  tournament_id: string;
  team_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  players_json: string;
  submitted_by: string;
  submitted_by_name: string;
  submitted_at: string;
  status: RegistrationStatus;
  reviewed_by: string;
  reviewed_at: string;
  review_notes: string;
}

export interface TournamentAuditLog {
  audit_id: string;
  module: 'tournaments';
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string;
  actor_name: string;
  timestamp: string;
  details: string;
}

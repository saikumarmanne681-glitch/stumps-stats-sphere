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
  season_id?: string;
  season_year?: number | string;
  source_type?: 'existing' | 'custom';
  public_page_path?: string;
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

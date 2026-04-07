export interface Player {
  player_id: string;
  name: string;
  username: string;
  password: string;
  phone: string;
  role: 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper';
  status: 'active' | 'inactive';
}

export interface Tournament {
  tournament_id: string;
  name: string;
  format: string;
  overs: number;
  description: string;
}

export interface Season {
  season_id: string;
  tournament_id: string;
  year: number;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  winner_team?: string;
  runner_up_team?: string;
}

export interface Match {
  match_id: string;
  season_id: string;
  tournament_id: string;
  date: string;
  team_a: string;
  team_b: string;
  venue: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  toss_winner: string;
  toss_decision: string;
  result: string;
  man_of_match: string;
  team_a_score: string;
  team_b_score: string;
  match_stage?: string;
  scorecard_version?: number;
  scorecard_checksum?: string;
  scorecard_operation_id?: string;
  team_a_captain?: string;
  team_b_captain?: string;
}

export interface BattingScorecard {
  id: string;
  match_id: string;
  player_id: string;
  team: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strike_rate: number;
  how_out: string;
  bowler_id: string;
}

export interface BowlingScorecard {
  id: string;
  match_id: string;
  player_id: string;
  team: string;
  overs: number;
  maidens: number;
  runs_conceded: number;
  wickets: number;
  economy: number;
  extras: number;
}

export interface ScorecardReplaceRequest {
  match_id: string;
  expected_scorecard_version?: number;
  expected_scorecard_checksum?: string;
  batting_entries: BattingScorecard[];
  bowling_entries: BowlingScorecard[];
}

export interface ScorecardReplaceResult {
  success: boolean;
  operation_id: string;
  scorecard_version: number;
  scorecard_checksum: string;
  partial_write?: boolean;
  error?: string;
  retry_guidance?: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  date: string;
  active: boolean;
  created_by: string;
}

export interface Message {
  id: string;
  from_id: string;
  to_id: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
  reply_to: string;
  timestamp: string;
}

export interface AuthUser {
  type: 'admin' | 'player' | 'management' | 'team';
  player_id?: string;
  management_id?: string;
  team_id?: string;
  team_name?: string;
  username: string;
  name?: string;
  designation?: string;
  role?: string;
  authority_level?: number;
}

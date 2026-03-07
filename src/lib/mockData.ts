import { Player, Tournament, Season, Match, BattingScorecard, BowlingScorecard, Announcement, Message } from './types';

export const mockPlayers: Player[] = [
  { player_id: 'P001', name: 'Rahul Sharma', username: 'rahul', password: '1234', phone: '9876543210', role: 'batsman', status: 'active' },
  { player_id: 'P002', name: 'Vikas Kumar', username: 'vikas', password: '1234', phone: '9876543211', role: 'bowler', status: 'active' },
  { player_id: 'P003', name: 'Amit Singh', username: 'amit', password: '1234', phone: '9876543212', role: 'allrounder', status: 'active' },
  { player_id: 'P004', name: 'Suresh Reddy', username: 'suresh', password: '1234', phone: '9876543213', role: 'wicketkeeper', status: 'active' },
  { player_id: 'P005', name: 'Kiran Patel', username: 'kiran', password: '1234', phone: '9876543214', role: 'batsman', status: 'active' },
  { player_id: 'P006', name: 'Ravi Teja', username: 'ravi', password: '1234', phone: '9876543215', role: 'bowler', status: 'active' },
  { player_id: 'P007', name: 'Deepak Rao', username: 'deepak', password: '1234', phone: '9876543216', role: 'allrounder', status: 'active' },
  { player_id: 'P008', name: 'Manoj Kumar', username: 'manoj', password: '1234', phone: '9876543217', role: 'batsman', status: 'inactive' },
];

export const mockTournaments: Tournament[] = [
  { tournament_id: 'T001', name: 'Premier League', format: 'T20', overs: 20, description: 'Annual T20 tournament' },
  { tournament_id: 'T002', name: 'Champions Cup', format: 'ODI', overs: 50, description: 'One day format championship' },
  { tournament_id: 'T003', name: 'Weekend Bash', format: 'T10', overs: 10, description: 'Quick fire weekend matches' },
];

export const mockSeasons: Season[] = [
  { season_id: 'S001', tournament_id: 'T001', year: 2024, start_date: '2024-03-01', end_date: '2024-05-31', status: 'completed' },
  { season_id: 'S002', tournament_id: 'T001', year: 2025, start_date: '2025-03-01', end_date: '2025-05-31', status: 'ongoing' },
  { season_id: 'S003', tournament_id: 'T002', year: 2024, start_date: '2024-06-01', end_date: '2024-08-31', status: 'completed' },
  { season_id: 'S004', tournament_id: 'T003', year: 2025, start_date: '2025-01-01', end_date: '2025-12-31', status: 'ongoing' },
];

export const mockMatches: Match[] = [
  { match_id: 'M001', season_id: 'S001', tournament_id: 'T001', date: '2024-03-15', team_a: 'Thunder XI', team_b: 'Storm Kings', venue: 'City Ground', status: 'completed', toss_winner: 'Thunder XI', toss_decision: 'bat', result: 'Thunder XI won by 25 runs', man_of_match: 'P001' },
  { match_id: 'M002', season_id: 'S001', tournament_id: 'T001', date: '2024-03-22', team_a: 'Royal Stars', team_b: 'Thunder XI', venue: 'Sports Complex', status: 'completed', toss_winner: 'Royal Stars', toss_decision: 'bowl', result: 'Thunder XI won by 5 wickets', man_of_match: 'P003' },
  { match_id: 'M003', season_id: 'S002', tournament_id: 'T001', date: '2025-03-10', team_a: 'Thunder XI', team_b: 'Royal Stars', venue: 'City Ground', status: 'completed', toss_winner: 'Thunder XI', toss_decision: 'bat', result: 'Royal Stars won by 3 wickets', man_of_match: 'P005' },
  { match_id: 'M004', season_id: 'S003', tournament_id: 'T002', date: '2024-07-05', team_a: 'Storm Kings', team_b: 'Royal Stars', venue: 'National Stadium', status: 'completed', toss_winner: 'Storm Kings', toss_decision: 'bat', result: 'Storm Kings won by 45 runs', man_of_match: 'P002' },
  { match_id: 'M005', season_id: 'S002', tournament_id: 'T001', date: '2025-03-20', team_a: 'Storm Kings', team_b: 'Thunder XI', venue: 'City Ground', status: 'scheduled', toss_winner: '', toss_decision: '', result: '', man_of_match: '' },
];

export const mockBattingScorecard: BattingScorecard[] = [
  { id: 'B001', match_id: 'M001', player_id: 'P001', team: 'Thunder XI', runs: 78, balls: 52, fours: 8, sixes: 3, strike_rate: 150.0, how_out: 'caught', bowler_id: 'P006' },
  { id: 'B002', match_id: 'M001', player_id: 'P003', team: 'Thunder XI', runs: 45, balls: 30, fours: 5, sixes: 2, strike_rate: 150.0, how_out: 'bowled', bowler_id: 'P002' },
  { id: 'B003', match_id: 'M001', player_id: 'P004', team: 'Thunder XI', runs: 22, balls: 18, fours: 2, sixes: 1, strike_rate: 122.2, how_out: 'lbw', bowler_id: 'P006' },
  { id: 'B004', match_id: 'M001', player_id: 'P005', team: 'Thunder XI', runs: 12, balls: 10, fours: 1, sixes: 0, strike_rate: 120.0, how_out: 'run out', bowler_id: '' },
  { id: 'B005', match_id: 'M001', player_id: 'P002', team: 'Storm Kings', runs: 35, balls: 28, fours: 4, sixes: 1, strike_rate: 125.0, how_out: 'caught', bowler_id: 'P003' },
  { id: 'B006', match_id: 'M001', player_id: 'P006', team: 'Storm Kings', runs: 28, balls: 22, fours: 3, sixes: 1, strike_rate: 127.3, how_out: 'stumped', bowler_id: 'P003' },
  { id: 'B007', match_id: 'M001', player_id: 'P007', team: 'Storm Kings', runs: 40, balls: 35, fours: 4, sixes: 2, strike_rate: 114.3, how_out: 'not out', bowler_id: '' },
  { id: 'B008', match_id: 'M002', player_id: 'P001', team: 'Thunder XI', runs: 55, balls: 40, fours: 6, sixes: 2, strike_rate: 137.5, how_out: 'caught', bowler_id: 'P007' },
  { id: 'B009', match_id: 'M002', player_id: 'P003', team: 'Thunder XI', runs: 62, balls: 38, fours: 7, sixes: 3, strike_rate: 163.2, how_out: 'not out', bowler_id: '' },
  { id: 'B010', match_id: 'M003', player_id: 'P005', team: 'Royal Stars', runs: 88, balls: 55, fours: 10, sixes: 4, strike_rate: 160.0, how_out: 'caught', bowler_id: 'P002' },
  { id: 'B011', match_id: 'M003', player_id: 'P001', team: 'Thunder XI', runs: 34, balls: 28, fours: 4, sixes: 1, strike_rate: 121.4, how_out: 'bowled', bowler_id: 'P007' },
  { id: 'B012', match_id: 'M004', player_id: 'P002', team: 'Storm Kings', runs: 92, balls: 78, fours: 10, sixes: 3, strike_rate: 117.9, how_out: 'not out', bowler_id: '' },
  { id: 'B013', match_id: 'M004', player_id: 'P006', team: 'Storm Kings', runs: 15, balls: 20, fours: 1, sixes: 0, strike_rate: 75.0, how_out: 'caught', bowler_id: 'P003' },
  { id: 'B014', match_id: 'M004', player_id: 'P005', team: 'Royal Stars', runs: 42, balls: 50, fours: 4, sixes: 1, strike_rate: 84.0, how_out: 'bowled', bowler_id: 'P002' },
];

export const mockBowlingScorecard: BowlingScorecard[] = [
  { id: 'BW001', match_id: 'M001', player_id: 'P002', team: 'Storm Kings', overs: 4, maidens: 0, runs_conceded: 38, wickets: 1, economy: 9.5, extras: 2 },
  { id: 'BW002', match_id: 'M001', player_id: 'P006', team: 'Storm Kings', overs: 4, maidens: 1, runs_conceded: 28, wickets: 2, economy: 7.0, extras: 1 },
  { id: 'BW003', match_id: 'M001', player_id: 'P003', team: 'Thunder XI', overs: 4, maidens: 0, runs_conceded: 32, wickets: 2, economy: 8.0, extras: 3 },
  { id: 'BW004', match_id: 'M001', player_id: 'P007', team: 'Storm Kings', overs: 4, maidens: 0, runs_conceded: 42, wickets: 0, economy: 10.5, extras: 2 },
  { id: 'BW005', match_id: 'M002', player_id: 'P007', team: 'Royal Stars', overs: 4, maidens: 0, runs_conceded: 35, wickets: 1, economy: 8.75, extras: 1 },
  { id: 'BW006', match_id: 'M003', player_id: 'P002', team: 'Thunder XI', overs: 4, maidens: 0, runs_conceded: 45, wickets: 1, economy: 11.25, extras: 2 },
  { id: 'BW007', match_id: 'M003', player_id: 'P007', team: 'Royal Stars', overs: 4, maidens: 1, runs_conceded: 22, wickets: 1, economy: 5.5, extras: 0 },
  { id: 'BW008', match_id: 'M004', player_id: 'P002', team: 'Storm Kings', overs: 10, maidens: 2, runs_conceded: 42, wickets: 3, economy: 4.2, extras: 1 },
  { id: 'BW009', match_id: 'M004', player_id: 'P003', team: 'Royal Stars', overs: 10, maidens: 1, runs_conceded: 55, wickets: 1, economy: 5.5, extras: 3 },
];

export const mockAnnouncements: Announcement[] = [
  { id: 'A001', title: 'Season 2025 Registrations Open', message: 'Register now for the Premier League 2025 season. Last date: Feb 28, 2025.', date: '2025-02-01', active: true, created_by: 'admin' },
  { id: 'A002', title: 'Ground Maintenance Notice', message: 'City Ground will be under maintenance from March 5-8. Matches rescheduled.', date: '2025-03-01', active: true, created_by: 'admin' },
  { id: 'A003', title: 'Annual Awards Night', message: 'Join us for the annual awards ceremony on April 15 at Grand Hotel.', date: '2025-03-05', active: true, created_by: 'admin' },
  { id: 'A004', title: 'Old Notice', message: 'This is an old inactive announcement.', date: '2024-01-01', active: false, created_by: 'admin' },
];

export const mockMessages: Message[] = [
  { id: 'MSG001', from_id: 'admin', to_id: 'P001', subject: 'Selection for upcoming match', body: 'You have been selected for the match on March 20.', date: '2025-03-06', read: false, reply_to: '' },
  { id: 'MSG002', from_id: 'admin', to_id: 'P003', subject: 'Captain duty', body: 'You will captain the team for next match.', date: '2025-03-06', read: true, reply_to: '' },
  { id: 'MSG003', from_id: 'P001', to_id: 'admin', subject: 'Re: Selection for upcoming match', body: 'Thank you! I will be available.', date: '2025-03-06', read: true, reply_to: 'MSG001' },
  { id: 'MSG004', from_id: 'admin', to_id: 'all', subject: 'Practice session this weekend', body: 'Mandatory practice on Saturday at 7 AM.', date: '2025-03-05', read: false, reply_to: '' },
];

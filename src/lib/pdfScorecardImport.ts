import { BattingScorecard, BowlingScorecard, Match, Player, Season, Tournament } from './types';

export interface UploadedPdfMeta {
  id: string;
  name: string;
  size: number;
  uploaded_at: string;
}

export interface ScorecardImportMatchDraft {
  draft_id: string;
  source_pdf_id: string;
  source_pdf_name: string;
  date: string;
  team_a: string;
  team_b: string;
  venue: string;
  result: string;
  toss_winner: string;
  toss_decision: string;
  man_of_match: string;
  match_stage: string;
  status: Match['status'];
  batting_text: string;
  bowling_text: string;
}

export interface ExtractedPlayerReview {
  source_name: string;
  corrected_name: string;
  role: Player['role'];
  status: Player['status'];
  existing_player_id?: string;
  is_new: boolean;
}

export interface ScorecardImportDraft {
  draft_id: string;
  uploaded_files: UploadedPdfMeta[];
  tournament_mode: 'existing' | 'new';
  tournament_id: string;
  new_tournament_name: string;
  new_tournament_format: string;
  new_tournament_overs: number;
  new_tournament_description: string;
  season_mode: 'existing' | 'new';
  season_id: string;
  new_season_name: string;
  new_season_year: number;
  new_season_status: Season['status'];
  new_season_start_date: string;
  new_season_end_date: string;
  matches: ScorecardImportMatchDraft[];
  player_reviews: ExtractedPlayerReview[];
  needs_user_review: boolean;
  approved_at?: string;
}

export interface ParsedBattingLine {
  playerName: string;
  team: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  howOut: string;
  bowlerName: string;
}

export interface ParsedBowlingLine {
  playerName: string;
  team: string;
  overs: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
  extras: number;
}

const PLAYER_CORRECTIONS_KEY = 'pdf-scorecard-player-corrections';

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
}

export function createEmptyImportDraft(): ScorecardImportDraft {
  return {
    draft_id: `pdf-import-${Date.now()}`,
    uploaded_files: [],
    tournament_mode: 'existing',
    tournament_id: '',
    new_tournament_name: '',
    new_tournament_format: 'T20',
    new_tournament_overs: 20,
    new_tournament_description: '',
    season_mode: 'existing',
    season_id: '',
    new_season_name: '',
    new_season_year: new Date().getFullYear(),
    new_season_status: 'ongoing',
    new_season_start_date: '',
    new_season_end_date: '',
    matches: [],
    player_reviews: [],
    needs_user_review: true,
  };
}

export function createMatchDraft(file: File): ScorecardImportMatchDraft {
  const baseName = file.name.replace(/\.pdf$/i, '');
  const yearMatch = baseName.match(/(19|20)\d{2}/);
  return {
    draft_id: `${slugify(baseName) || 'match'}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    source_pdf_id: `${file.name}-${file.size}`,
    source_pdf_name: file.name,
    date: '',
    team_a: '',
    team_b: '',
    venue: '',
    result: '',
    toss_winner: '',
    toss_decision: '',
    man_of_match: '',
    match_stage: 'League',
    status: 'completed',
    batting_text: `# ${baseName}\n# Format: Player Name | Team | Runs | Balls | 4s | 6s | How out | Bowler\n`,
    bowling_text: `# ${baseName}${yearMatch ? ` (${yearMatch[0]})` : ''}\n# Format: Player Name | Team | Overs | Maidens | Runs | Wickets | Extras\n`,
  };
}

export function getStoredPlayerCorrections(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(PLAYER_CORRECTIONS_KEY) || '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

export function storePlayerCorrections(reviews: ExtractedPlayerReview[]) {
  if (typeof window === 'undefined') return;
  const current = getStoredPlayerCorrections();
  const next = { ...current };
  reviews.forEach((review) => {
    const source = review.source_name.trim().toLowerCase();
    const corrected = review.corrected_name.trim();
    if (source && corrected) next[source] = corrected;
  });
  window.localStorage.setItem(PLAYER_CORRECTIONS_KEY, JSON.stringify(next));
}

function toNumber(raw: string) {
  const value = Number(raw.trim());
  return Number.isFinite(value) ? value : 0;
}

export function parseBattingText(text: string): ParsedBattingLine[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split('|').map((part) => part.trim()))
    .filter((parts) => parts.length >= 7)
    .map((parts) => ({
      playerName: parts[0] || '',
      team: parts[1] || '',
      runs: toNumber(parts[2] || '0'),
      balls: toNumber(parts[3] || '0'),
      fours: toNumber(parts[4] || '0'),
      sixes: toNumber(parts[5] || '0'),
      howOut: parts[6] || 'not out',
      bowlerName: parts[7] || '',
    }))
    .filter((row) => row.playerName && row.team);
}

export function parseBowlingText(text: string): ParsedBowlingLine[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split('|').map((part) => part.trim()))
    .filter((parts) => parts.length >= 6)
    .map((parts) => ({
      playerName: parts[0] || '',
      team: parts[1] || '',
      overs: toNumber(parts[2] || '0'),
      maidens: toNumber(parts[3] || '0'),
      runsConceded: toNumber(parts[4] || '0'),
      wickets: toNumber(parts[5] || '0'),
      extras: toNumber(parts[6] || '0'),
    }))
    .filter((row) => row.playerName && row.team);
}

export function buildPlayerReviews(matches: ScorecardImportMatchDraft[], existingPlayers: Player[]): ExtractedPlayerReview[] {
  const correctionMap = getStoredPlayerCorrections();
  const byName = new Map<string, ExtractedPlayerReview>();

  const register = (rawName: string) => {
    const sourceName = rawName.trim();
    if (!sourceName) return;
    const existing = existingPlayers.find((player) => player.name.toLowerCase() === sourceName.toLowerCase());
    const corrected = correctionMap[sourceName.toLowerCase()] || existing?.name || sourceName;

    if (!byName.has(sourceName.toLowerCase())) {
      byName.set(sourceName.toLowerCase(), {
        source_name: sourceName,
        corrected_name: corrected,
        role: existing?.role || 'allrounder',
        status: existing?.status || 'active',
        existing_player_id: existing?.player_id,
        is_new: !existing,
      });
    }
  };

  matches.forEach((match) => {
    parseBattingText(match.batting_text).forEach((row) => {
      register(row.playerName);
      register(row.bowlerName);
    });
    parseBowlingText(match.bowling_text).forEach((row) => register(row.playerName));
    register(match.man_of_match);
  });

  return Array.from(byName.values()).sort((a, b) => a.corrected_name.localeCompare(b.corrected_name));
}

export interface ApprovalPayload {
  tournament: Tournament;
  season: Season;
  playersToCreate: Player[];
  matches: Match[];
  battingEntries: BattingScorecard[];
  bowlingEntries: BowlingScorecard[];
}

function createPlayerId(existingPlayers: Player[], name: string) {
  const existingIds = new Set(existingPlayers.map((player) => player.player_id));
  let index = existingPlayers.length + 1;
  let candidate = `P${String(index).padStart(3, '0')}`;
  while (existingIds.has(candidate)) {
    index += 1;
    candidate = `P${String(index).padStart(3, '0')}`;
  }
  return candidate;
}

export function buildApprovalPayload(args: {
  draft: ScorecardImportDraft;
  tournaments: Tournament[];
  seasons: Season[];
  players: Player[];
}): ApprovalPayload {
  const { draft, tournaments, seasons, players } = args;
  const existingTournament = tournaments.find((item) => item.tournament_id === draft.tournament_id);
  const tournament = existingTournament || {
    tournament_id: `T-${slugify(draft.new_tournament_name) || Date.now()}`,
    name: draft.new_tournament_name.trim(),
    format: draft.new_tournament_format.trim() || 'T20',
    overs: draft.new_tournament_overs || 20,
    description: draft.new_tournament_description.trim(),
  };

  const existingSeason = seasons.find((item) => item.season_id === draft.season_id);
  const season = existingSeason || {
    season_id: `S-${tournament.tournament_id}-${draft.new_season_year}`,
    tournament_id: tournament.tournament_id,
    year: draft.new_season_year,
    start_date: draft.new_season_start_date,
    end_date: draft.new_season_end_date,
    status: draft.new_season_status,
  };

  const playersByName = new Map(players.map((player) => [player.name.toLowerCase(), player]));
  const playersToCreate: Player[] = [];
  draft.player_reviews.forEach((review) => {
    const correctedName = review.corrected_name.trim();
    if (!correctedName || playersByName.has(correctedName.toLowerCase())) return;
    const player: Player = {
      player_id: createPlayerId([...players, ...playersToCreate], correctedName),
      name: correctedName,
      username: slugify(correctedName) || `player-${Date.now()}`,
      password: 'changeme123',
      phone: '',
      role: review.role,
      status: review.status,
    };
    playersToCreate.push(player);
    playersByName.set(correctedName.toLowerCase(), player);
  });

  const reviewMap = new Map(draft.player_reviews.map((review) => [review.source_name.toLowerCase(), review.corrected_name]));
  const resolvePlayer = (sourceName: string) => {
    const corrected = reviewMap.get(sourceName.trim().toLowerCase()) || sourceName.trim();
    const player = playersByName.get(corrected.toLowerCase());
    return { corrected, playerId: player?.player_id || '' };
  };

  const matches: Match[] = [];
  const battingEntries: BattingScorecard[] = [];
  const bowlingEntries: BowlingScorecard[] = [];

  draft.matches.forEach((matchDraft, index) => {
    const matchId = `M-${season.season_id}-${String(index + 1).padStart(2, '0')}`;
    const batting = parseBattingText(matchDraft.batting_text);
    const bowling = parseBowlingText(matchDraft.bowling_text);
    const teamAScore = batting.filter((row) => row.team === matchDraft.team_a).reduce((sum, row) => sum + row.runs, 0);
    const teamBScore = batting.filter((row) => row.team === matchDraft.team_b).reduce((sum, row) => sum + row.runs, 0);

    const manOfMatch = resolvePlayer(matchDraft.man_of_match);
    matches.push({
      match_id: matchId,
      season_id: season.season_id,
      tournament_id: tournament.tournament_id,
      date: matchDraft.date,
      team_a: matchDraft.team_a,
      team_b: matchDraft.team_b,
      venue: matchDraft.venue,
      status: matchDraft.status,
      toss_winner: matchDraft.toss_winner,
      toss_decision: matchDraft.toss_decision,
      result: matchDraft.result,
      man_of_match: manOfMatch.playerId,
      team_a_score: String(teamAScore),
      team_b_score: String(teamBScore),
      match_stage: matchDraft.match_stage,
    });

    batting.forEach((row, battingIndex) => {
      const batter = resolvePlayer(row.playerName);
      const bowler = resolvePlayer(row.bowlerName);
      battingEntries.push({
        id: `BAT-${matchId}-${String(battingIndex + 1).padStart(2, '0')}`,
        match_id: matchId,
        player_id: batter.playerId,
        team: row.team,
        runs: row.runs,
        balls: row.balls,
        fours: row.fours,
        sixes: row.sixes,
        strike_rate: row.balls ? Number(((row.runs / row.balls) * 100).toFixed(2)) : 0,
        how_out: row.howOut,
        bowler_id: bowler.playerId,
      });
    });

    bowling.forEach((row, bowlingIndex) => {
      const bowler = resolvePlayer(row.playerName);
      bowlingEntries.push({
        id: `BOWL-${matchId}-${String(bowlingIndex + 1).padStart(2, '0')}`,
        match_id: matchId,
        player_id: bowler.playerId,
        team: row.team,
        overs: row.overs,
        maidens: row.maidens,
        runs_conceded: row.runsConceded,
        wickets: row.wickets,
        economy: row.overs ? Number((row.runsConceded / row.overs).toFixed(2)) : 0,
        extras: row.extras,
      });
    });
  });

  return {
    tournament,
    season,
    playersToCreate,
    matches,
    battingEntries,
    bowlingEntries,
  };
}

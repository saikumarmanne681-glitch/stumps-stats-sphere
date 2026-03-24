import { BattingScorecard, Match } from '@/lib/types';

export interface TeamScoreSummary {
  runs: number;
  wickets: number;
  balls: number;
  overs: string;
  display: string;
  hasEntries: boolean;
}

function normalizeFallbackScore(score?: string): TeamScoreSummary | null {
  if (!score) return null;
  const compact = String(score).replace(/ov(?:ers?)?/gi, '').replace(/\s+/g, ' ').trim();
  const match = compact.match(/(\d+)\/(\d+)(?:\s*\(?([\d.]+)\)?)?/);
  if (!match) return null;
  const [, runs, wickets, overs = '0.0'] = match;
  const [completedOvers, ballsPart = '0'] = overs.split('.');
  const balls = Number(completedOvers) * 6 + Number(ballsPart);
  return {
    runs: Number(runs),
    wickets: Number(wickets),
    balls,
    overs,
    display: `${runs}/${wickets} (${overs})`,
    hasEntries: true,
  };
}

export function getTeamScoreSummary(batting: BattingScorecard[], team: string, fallbackScore?: string): TeamScoreSummary {
  const rows = batting.filter((entry) => entry.team === team);
  const fallback = normalizeFallbackScore(fallbackScore);
  if (rows.length === 0) {
    return fallback || {
      runs: 0,
      wickets: 0,
      balls: 0,
      overs: '0.0',
      display: fallback?.display || fallbackScore || '0/0 (0.0)',
      hasEntries: false,
    };
  }

  const runsFromBatting = rows.reduce((sum, entry) => sum + (entry.runs || 0), 0);
  const wicketsFromDismissals = rows.filter((entry) => {
    const dismissal = String(entry.how_out || '').trim().toLowerCase();
    return dismissal && dismissal !== 'not out';
  }).length;
  const ballsFromBatting = rows.reduce((sum, entry) => sum + (entry.balls || 0), 0);

  const runs = Math.max(runsFromBatting, fallback?.runs || 0);
  const wickets = Math.max(wicketsFromDismissals, fallback?.wickets || 0);
  const balls = Math.max(ballsFromBatting, fallback?.balls || 0);
  const overs = `${Math.floor(balls / 6)}.${balls % 6}`;

  return {
    runs,
    wickets,
    balls,
    overs,
    display: `${runs}/${wickets} (${overs})`,
    hasEntries: true,
  };
}

export function getLiveMatchScorecard(match: Match, batting: BattingScorecard[]) {
  return {
    teamA: getTeamScoreSummary(batting.filter((entry) => entry.match_id === match.match_id), match.team_a, match.team_a_score),
    teamB: getTeamScoreSummary(batting.filter((entry) => entry.match_id === match.match_id), match.team_b, match.team_b_score),
  };
}

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
  const match = score.match(/(\d+)\/(\d+)\s*\(([\d.]+)\)/);
  if (!match) return null;
  const [, runs, wickets, overs] = match;
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
  if (rows.length === 0) {
    return normalizeFallbackScore(fallbackScore) || {
      runs: 0,
      wickets: 0,
      balls: 0,
      overs: '0.0',
      display: fallbackScore || '',
      hasEntries: false,
    };
  }

  const runs = rows.reduce((sum, entry) => sum + (entry.runs || 0), 0);
  const wickets = rows.filter((entry) => {
    const dismissal = String(entry.how_out || '').trim().toLowerCase();
    return dismissal && dismissal !== 'not out';
  }).length;
  const balls = rows.reduce((sum, entry) => sum + (entry.balls || 0), 0);
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

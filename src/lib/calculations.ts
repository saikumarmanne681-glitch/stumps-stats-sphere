import { BattingScorecard, BowlingScorecard, Match } from './types';

export function calcBattingStats(batting: BattingScorecard[]) {
  if (!batting.length) return null;
  const innings = batting.length;
  const totalRuns = batting.reduce((s, b) => s + b.runs, 0);
  const totalBalls = batting.reduce((s, b) => s + b.balls, 0);
  const totalFours = batting.reduce((s, b) => s + b.fours, 0);
  const totalSixes = batting.reduce((s, b) => s + b.sixes, 0);
  const dismissals = batting.filter(b => b.how_out !== 'not out').length;
  const avg = dismissals > 0 ? totalRuns / dismissals : totalRuns;
  const sr = totalBalls > 0 ? (totalRuns / totalBalls) * 100 : 0;
  const highest = Math.max(...batting.map(b => b.runs));
  const fifties = batting.filter(b => b.runs >= 50 && b.runs < 100).length;
  const hundreds = batting.filter(b => b.runs >= 100).length;
  const thirties = batting.filter(b => b.runs >= 30 && b.runs < 50).length;

  return { innings, totalRuns, totalBalls, totalFours, totalSixes, avg, sr, highest, fifties, hundreds, thirties, dismissals };
}

export function calcBowlingStats(bowling: BowlingScorecard[]) {
  if (!bowling.length) return null;
  const innings = bowling.length;
  const totalOvers = bowling.reduce((s, b) => s + b.overs, 0);
  const totalMaidens = bowling.reduce((s, b) => s + b.maidens, 0);
  const totalRuns = bowling.reduce((s, b) => s + b.runs_conceded, 0);
  const totalWickets = bowling.reduce((s, b) => s + b.wickets, 0);
  const economy = totalOvers > 0 ? totalRuns / totalOvers : 0;
  const avg = totalWickets > 0 ? totalRuns / totalWickets : 0;
  const bestWickets = Math.max(...bowling.map(b => b.wickets));
  const bestEntry = bowling.filter(b => b.wickets === bestWickets).sort((a, b) => a.runs_conceded - b.runs_conceded)[0];
  const bestFigures = bestEntry ? `${bestEntry.wickets}/${bestEntry.runs_conceded}` : '-';
  const threeWickets = bowling.filter(b => b.wickets >= 3).length;
  const fiveWickets = bowling.filter(b => b.wickets >= 5).length;

  return { innings, totalOvers, totalMaidens, totalRuns, totalWickets, economy, avg, bestFigures, threeWickets, fiveWickets };
}

export function getPlayerMatchCount(playerId: string, batting: BattingScorecard[], bowling: BowlingScorecard[]): number {
  const matchIds = new Set([
    ...batting.filter(b => b.player_id === playerId).map(b => b.match_id),
    ...bowling.filter(b => b.player_id === playerId).map(b => b.match_id),
  ]);
  return matchIds.size;
}

export function getTeamTotal(matchId: string, team: string, batting: BattingScorecard[]): number {
  return batting.filter(b => b.match_id === matchId && b.team === team).reduce((s, b) => s + b.runs, 0);
}

export function getTopRunScorers(batting: BattingScorecard[], limit = 10) {
  const playerRuns: Record<string, number> = {};
  batting.forEach(b => {
    playerRuns[b.player_id] = (playerRuns[b.player_id] || 0) + b.runs;
  });
  return Object.entries(playerRuns)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([player_id, runs]) => ({ player_id, runs }));
}

export function getTopWicketTakers(bowling: BowlingScorecard[], limit = 10) {
  const playerWickets: Record<string, number> = {};
  bowling.forEach(b => {
    playerWickets[b.player_id] = (playerWickets[b.player_id] || 0) + b.wickets;
  });
  return Object.entries(playerWickets)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([player_id, wickets]) => ({ player_id, wickets }));
}

export function getLatestMatches(matches: Match[], limit = 5) {
  return [...matches]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

/** Get matches played per player for leaderboard */
export function getPlayerMatchCounts(batting: BattingScorecard[], bowling: BowlingScorecard[]): Record<string, number> {
  const counts: Record<string, Set<string>> = {};
  const add = (pid: string, mid: string) => {
    if (!counts[pid]) counts[pid] = new Set();
    counts[pid].add(mid);
  };
  batting.forEach(b => add(b.player_id, b.match_id));
  bowling.forEach(b => add(b.player_id, b.match_id));
  const result: Record<string, number> = {};
  Object.entries(counts).forEach(([pid, set]) => { result[pid] = set.size; });
  return result;
}

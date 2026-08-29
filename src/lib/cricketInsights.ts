import type { BattingScorecard, BowlingScorecard, Match, Player } from './types';

export type FormPoint = { matchId: string; date: string; label: string; runs: number; balls: number; wickets: number; rollingAverage: number; strikeRate: number };
export type PlayerAward = { playerId: string; name: string; value: number; label: string };

const timestamp = (date: string) => new Date(date || 0).getTime() || 0;

export function playerForm(playerId: string, batting: BattingScorecard[], bowling: BowlingScorecard[], matches: Match[], limit = 10): FormPoint[] {
  const matchById = new Map(matches.map((match) => [match.match_id, match]));
  const ids = new Set([...batting.filter((row) => row.player_id === playerId), ...bowling.filter((row) => row.player_id === playerId)].map((row) => row.match_id));
  const ordered = [...ids].sort((a, b) => timestamp(matchById.get(a)?.date || '') - timestamp(matchById.get(b)?.date || '')).slice(-limit);
  let cumulativeRuns = 0;
  let dismissals = 0;
  return ordered.map((matchId, index) => {
    const bat = batting.find((row) => row.player_id === playerId && row.match_id === matchId);
    const bowl = bowling.find((row) => row.player_id === playerId && row.match_id === matchId);
    const runs = bat?.runs || 0;
    const balls = bat?.balls || 0;
    cumulativeRuns += runs;
    if (bat && bat.how_out.toLowerCase() !== 'not out') dismissals += 1;
    const match = matchById.get(matchId);
    return { matchId, date: match?.date || '', label: `#${index + 1}`, runs, balls, wickets: bowl?.wickets || 0, rollingAverage: Number((cumulativeRuns / Math.max(dismissals, 1)).toFixed(1)), strikeRate: balls ? Number(((runs / balls) * 100).toFixed(1)) : 0 };
  });
}

export function playerBadges(playerId: string, batting: BattingScorecard[], bowling: BowlingScorecard[]) {
  const scores = batting.filter((row) => row.player_id === playerId);
  const spells = bowling.filter((row) => row.player_id === playerId);
  const badges = [
    ...scores.filter((row) => row.runs >= 100).map((row) => ({ id: `century-${row.id}`, label: 'Century', detail: `${row.runs} runs`, tone: 'gold' })),
    ...scores.filter((row) => row.runs >= 50 && row.runs < 100).map((row) => ({ id: `fifty-${row.id}`, label: 'Fifty', detail: `${row.runs} runs`, tone: 'emerald' })),
    ...spells.filter((row) => row.wickets >= 5).map((row) => ({ id: `fivefor-${row.id}`, label: 'Five-for', detail: `${row.wickets}/${row.runs_conceded}`, tone: 'violet' })),
  ];
  // Ball-by-ball data is not stored, so a hat-trick is deliberately not inferred.
  return badges;
}

export function mvpRace(players: Player[], batting: BattingScorecard[], bowling: BowlingScorecard[]): PlayerAward[] {
  return players.map((player) => {
    const runs = batting.filter((row) => row.player_id === player.player_id).reduce((sum, row) => sum + row.runs, 0);
    const wickets = bowling.filter((row) => row.player_id === player.player_id).reduce((sum, row) => sum + row.wickets, 0);
    const catchesProxy = batting.filter((row) => row.player_id === player.player_id && row.how_out.toLowerCase().includes('catch')).length;
    return { playerId: player.player_id, name: player.name, value: runs + wickets * 25 + catchesProxy * 8, label: `${runs} runs · ${wickets} wkts` };
  }).filter((item) => item.value > 0).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

export function seasonAwards(players: Player[], batting: BattingScorecard[], bowling: BowlingScorecard[]) {
  const byRuns = players.map((player) => ({ playerId: player.player_id, name: player.name, value: batting.filter((row) => row.player_id === player.player_id).reduce((sum, row) => sum + row.runs, 0), label: 'runs' })).sort((a, b) => b.value - a.value);
  const byWickets = players.map((player) => ({ playerId: player.player_id, name: player.name, value: bowling.filter((row) => row.player_id === player.player_id).reduce((sum, row) => sum + row.wickets, 0), label: 'wickets' })).sort((a, b) => b.value - a.value);
  const emerging = mvpRace(players, batting, bowling).filter((item) => batting.filter((row) => row.player_id === item.playerId).length + bowling.filter((row) => row.player_id === item.playerId).length <= 10)[0];
  return { batter: byRuns[0], bowler: byWickets[0], emerging };
}

export function venueAndTossSummary(matches: Match[]) {
  const completed = matches.filter((match) => match.status === 'completed');
  const venues = new Map<string, { played: number; results: number }>();
  let batFirstWins = 0;
  let chaseWins = 0;
  completed.forEach((match) => {
    const venue = match.venue || 'Unspecified venue';
    const row = venues.get(venue) || { played: 0, results: 0 };
    row.played += 1;
    if (match.result) row.results += 1;
    venues.set(venue, row);
    const result = match.result.toLowerCase();
    const tossTeam = match.toss_winner.toLowerCase();
    const tossBatted = match.toss_decision.toLowerCase().includes('bat');
    const tossWon = tossTeam && result.includes(tossTeam) && (result.includes('won') || result.includes('beat'));
    if (tossWon) {
      if (tossBatted) batFirstWins += 1;
      else chaseWins += 1;
    }
  });
  return { venues: [...venues.entries()].map(([venue, value]) => ({ venue, ...value })).sort((a, b) => b.played - a.played), batFirstWins, chaseWins };
}

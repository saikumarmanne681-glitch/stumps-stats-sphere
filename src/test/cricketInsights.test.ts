import { describe, expect, it } from 'vitest';
import { mvpRace, playerBadges, playerForm, venueAndTossSummary } from '@/lib/cricketInsights';
import type { BattingScorecard, BowlingScorecard, Match, Player } from '@/lib/types';

const players: Player[] = [
  { player_id: 'p1', name: 'Asha', username: 'asha', password: '', phone: '', role: 'allrounder', status: 'active' },
  { player_id: 'p2', name: 'Ben', username: 'ben', password: '', phone: '', role: 'bowler', status: 'active' },
];
const matches: Match[] = [{ match_id: 'm1', season_id: 's1', tournament_id: 't1', date: '2026-01-01', team_a: 'A', team_b: 'B', venue: 'Oval', status: 'completed', toss_winner: 'A', toss_decision: 'bat', result: 'A won', man_of_match: '', team_a_score: '', team_b_score: '' }];
const batting: BattingScorecard[] = [{ id: 'b1', match_id: 'm1', player_id: 'p1', team: 'A', runs: 102, balls: 60, fours: 10, sixes: 4, strike_rate: 170, how_out: 'bowled', bowler_id: 'p2' }];
const bowling: BowlingScorecard[] = [{ id: 'w1', match_id: 'm1', player_id: 'p2', team: 'B', overs: 4, maidens: 0, runs_conceded: 20, wickets: 5, economy: 5, extras: 0 }];

describe('cricket insights', () => {
  it('derives form and scorecard milestones', () => {
    expect(playerForm('p1', batting, bowling, matches)).toMatchObject([{ runs: 102, rollingAverage: 102 }]);
    expect(playerBadges('p1', batting, bowling)).toContainEqual(expect.objectContaining({ label: 'Century' }));
    expect(playerBadges('p2', batting, bowling)).toContainEqual(expect.objectContaining({ label: 'Five-for' }));
  });
  it('scores the mvp race and toss summary deterministically', () => {
    expect(mvpRace(players, batting, bowling)[0]).toMatchObject({ playerId: 'p2', value: 125 });
    expect(venueAndTossSummary(matches)).toMatchObject({ batFirstWins: 1, chaseWins: 0, venues: [{ venue: 'Oval', played: 1 }] });
  });
});

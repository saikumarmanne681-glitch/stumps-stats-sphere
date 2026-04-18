import { generateId } from '@/lib/utils';
import { ScheduleFormat, ScheduleGenerationPolicy, ScheduleMatch } from './types';

interface GeneratorInput {
  tournamentName: string;
  teams: string[];
  policy: ScheduleGenerationPolicy;
}

interface TeamAvailability {
  lastDayPlayed?: string;
  dayCounts: Record<string, number>;
  totalMatches: number;
  venues: Record<string, number>;
}

const stageLabelByFormat: Record<ScheduleFormat, string> = {
  round_robin: 'League',
  double_round_robin: 'League',
  single_elimination: 'Knockout',
  double_elimination: 'Double Elim',
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function listDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const result: string[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    result.push(toIsoDate(cursor));
  }
  return result;
}

function combinations(teams: string[]) {
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < teams.length; i += 1) {
    for (let j = i + 1; j < teams.length; j += 1) {
      pairs.push([teams[i], teams[j]]);
    }
  }
  return pairs;
}

function rotateForRoundRobin(teams: string[]) {
  if (teams.length <= 2) return teams;
  const fixed = teams[0];
  const rotating = teams.slice(1);
  const last = rotating.pop();
  if (!last) return teams;
  rotating.unshift(last);
  return [fixed, ...rotating];
}

function roundRobinMatches(teams: string[], doubleLeg: boolean) {
  const normalized = teams.length % 2 === 0 ? [...teams] : [...teams, 'BYE'];
  const rounds = normalized.length - 1;
  let rotation = [...normalized];
  const matches: Array<[string, string]> = [];

  for (let round = 0; round < rounds; round += 1) {
    for (let i = 0; i < rotation.length / 2; i += 1) {
      const home = rotation[i];
      const away = rotation[rotation.length - 1 - i];
      if (home === 'BYE' || away === 'BYE') continue;
      const shouldSwap = round % 2 === 1;
      matches.push(shouldSwap ? [away, home] : [home, away]);
    }
    rotation = rotateForRoundRobin(rotation);
  }

  if (!doubleLeg) return matches;
  return [...matches, ...matches.map(([a, b]) => [b, a] as [string, string])];
}

function eliminationMatches(teams: string[]) {
  let seeded = [...teams];
  const output: Array<[string, string]> = [];

  while (seeded.length > 1) {
    const roundPairs: Array<[string, string]> = [];
    const winnerPlaceholders: string[] = [];
    while (seeded.length > 1) {
      const home = seeded.shift()!;
      const away = seeded.pop()!;
      roundPairs.push([home, away]);
      winnerPlaceholders.push(`Winner of ${home} vs ${away}`);
    }
    if (seeded.length === 1) winnerPlaceholders.push(seeded[0]);
    output.push(...roundPairs);
    seeded = winnerPlaceholders;
  }

  return output;
}

function matchesByFormat(format: ScheduleFormat, teams: string[]) {
  if (format === 'round_robin') return roundRobinMatches(teams, false);
  if (format === 'double_round_robin') return roundRobinMatches(teams, true);
  if (format === 'single_elimination') return eliminationMatches(teams);
  return [...eliminationMatches(teams), ...combinations(teams)];
}

function canPlace(
  teamA: string,
  teamB: string,
  day: string,
  availability: Record<string, TeamAvailability>,
  allowSameDayMultipleMatches: boolean,
  allowConsecutiveDays: boolean,
) {
  const teams = [teamA, teamB];
  return teams.every((team) => {
    const state = availability[team] || { dayCounts: {}, totalMatches: 0, venues: {} };
    const dayCount = state.dayCounts[day] || 0;
    if (!allowSameDayMultipleMatches && dayCount >= 1) return false;
    if (!allowConsecutiveDays && state.lastDayPlayed) {
      const prev = new Date(`${state.lastDayPlayed}T00:00:00Z`);
      const current = new Date(`${day}T00:00:00Z`);
      const diffDays = (current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays === 1) return false;
    }
    return true;
  });
}

function markPlaced(teamA: string, teamB: string, day: string, availability: Record<string, TeamAvailability>) {
  [teamA, teamB].forEach((team) => {
    if (!availability[team]) availability[team] = { dayCounts: {}, totalMatches: 0, venues: {} };
    availability[team].dayCounts[day] = (availability[team].dayCounts[day] || 0) + 1;
    availability[team].lastDayPlayed = day;
    availability[team].totalMatches += 1;
  });
}

function matchFairnessScore(teamA: string, teamB: string, day: string, venue: string, availability: Record<string, TeamAvailability>) {
  const stateA = availability[teamA] || { dayCounts: {}, totalMatches: 0, venues: {} };
  const stateB = availability[teamB] || { dayCounts: {}, totalMatches: 0, venues: {} };
  const matchesGapPenalty = Math.abs(stateA.totalMatches - stateB.totalMatches) * 10;
  const dateDistancePenalty = [stateA.lastDayPlayed, stateB.lastDayPlayed].reduce((acc, lastDay) => {
    if (!lastDay) return acc;
    const diffDays = (new Date(`${day}T00:00:00Z`).getTime() - new Date(`${lastDay}T00:00:00Z`).getTime()) / (1000 * 60 * 60 * 24);
    return acc + (diffDays <= 2 ? (3 - diffDays) * 5 : 0);
  }, 0);
  const venueRepeatPenalty = (stateA.venues[venue] || 0) + (stateB.venues[venue] || 0);
  return matchesGapPenalty + dateDistancePenalty + venueRepeatPenalty;
}

export function generateTournamentSchedule(input: GeneratorInput): ScheduleMatch[] {
  const { teams, policy } = input;
  if (!policy.start_date || !policy.end_date || new Date(policy.start_date).getTime() > new Date(policy.end_date).getTime()) {
    return [];
  }
  const days = listDays(policy.start_date, policy.end_date);
  const candidateMatches = matchesByFormat(policy.format, teams);
  const availability: Record<string, TeamAvailability> = {};

  const slots = days.flatMap((day) => {
    const dayTimes = policy.match_times.slice(0, Math.max(1, policy.matches_per_day));
    return dayTimes.map((time, slotIndex) => ({ day, time, slotIndex }));
  });

  const output: ScheduleMatch[] = [];
  const queue = [...candidateMatches];

  for (const slot of slots) {
    if (!queue.length) break;
    const venue = policy.venues[slot.slotIndex % Math.max(1, policy.venues.length)] || 'Main Ground';

    const selectable = queue
      .map(([teamA, teamB], index) => ({ teamA, teamB, index }))
      .filter(({ teamA, teamB }) => canPlace(
        teamA,
        teamB,
        slot.day,
        availability,
        policy.allow_same_day_multiple_matches,
        policy.allow_consecutive_days,
      ))
      .map((entry) => ({ ...entry, score: matchFairnessScore(entry.teamA, entry.teamB, slot.day, venue, availability) }))
      .sort((a, b) => a.score - b.score);

    if (!selectable.length) continue;

    const [teamA, teamB] = queue.splice(selectable[0].index, 1)[0];
    markPlaced(teamA, teamB, slot.day, availability);
    availability[teamA].venues[venue] = (availability[teamA].venues[venue] || 0) + 1;
    availability[teamB].venues[venue] = (availability[teamB].venues[venue] || 0) + 1;

    output.push({
      match_id: generateId('SCHM'),
      date: slot.day,
      time: slot.time,
      venue,
      team_a: teamA,
      team_b: teamB,
      stage: stageLabelByFormat[policy.format],
      notes: `Generated by Schedule Studio (${input.tournamentName}).`,
    });
  }

  return output;
}

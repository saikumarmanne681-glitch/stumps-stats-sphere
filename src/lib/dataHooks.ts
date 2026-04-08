import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from './googleSheets';
import { queryKeys } from './queryKeys';
import { getLatestMatches } from './calculations';
import { calcBattingStats, calcBowlingStats } from './calculations';
import { v2api } from './v2api';

export function usePlayersQuery() {
  return useQuery({ queryKey: queryKeys.players, queryFn: api.getPlayers });
}

export function useTournamentsQuery() {
  return useQuery({ queryKey: queryKeys.tournaments, queryFn: api.getTournaments });
}

export function useSeasonsQuery() {
  return useQuery({ queryKey: queryKeys.seasons, queryFn: api.getSeasons });
}

export function useMatchesQuery({ live = false }: { live?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.matches,
    queryFn: api.getMatches,
    refetchInterval: live ? 10_000 : false,
  });
}

export function useBattingQuery({ live = false }: { live?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.batting,
    queryFn: api.getBattingScorecard,
    refetchInterval: live ? 10_000 : false,
  });
}

export function useBowlingQuery({ live = false }: { live?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.bowling,
    queryFn: api.getBowlingScorecard,
    refetchInterval: live ? 10_000 : false,
  });
}

export function useAnnouncementsQuery() {
  return useQuery({ queryKey: queryKeys.announcements, queryFn: api.getAnnouncements });
}

export function useMessagesQuery() {
  return useQuery({ queryKey: queryKeys.messages, queryFn: api.getMessages });
}

export function useTimelineQuery({ live = false }: { live?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.timeline,
    queryFn: () => v2api.getMatchTimeline(),
    refetchInterval: live ? 10_000 : false,
  });
}

export function useMatchSlices(matchId?: string) {
  const { data: matches = [] } = useMatchesQuery();
  const { data: batting = [] } = useBattingQuery();
  const { data: bowling = [] } = useBowlingQuery();

  return useMemo(() => {
    if (!matchId) return { match: undefined, batting: [], bowling: [] };
    return {
      match: matches.find((m) => m.match_id === matchId),
      batting: batting.filter((b) => b.match_id === matchId),
      bowling: bowling.filter((b) => b.match_id === matchId),
    };
  }, [matchId, matches, batting, bowling]);
}

export function useHomePageData(filters: {
  filterTournament: string;
  filterSeason: string;
  showAllMatches: boolean;
  matchSearch: string;
}) {
  const { data: matches = [] } = useMatchesQuery();
  const { data: tournaments = [] } = useTournamentsQuery();
  const { data: seasons = [] } = useSeasonsQuery();

  const latestMatches = useMemo(() => getLatestMatches(matches, 9), [matches]);

  const relevantSeasons = useMemo(() => {
    if (filters.filterTournament === 'all') return seasons;
    return seasons.filter((s) => s.tournament_id === filters.filterTournament);
  }, [filters.filterTournament, seasons]);

  const filteredMatchIds = useMemo(() => {
    let filtered = matches;
    if (filters.filterTournament !== 'all') {
      filtered = filtered.filter((m) => m.tournament_id === filters.filterTournament);
    }
    if (filters.filterSeason !== 'all') {
      filtered = filtered.filter((m) => m.season_id === filters.filterSeason);
    }
    return filtered.map((m) => m.match_id);
  }, [filters.filterTournament, filters.filterSeason, matches]);

  const displayMatches = useMemo(() => {
    const sourceMatches = filters.showAllMatches ? getLatestMatches(matches, matches.length) : latestMatches;
    let result = sourceMatches;
    if (filters.filterTournament !== 'all') {
      result = result.filter((m) => m.tournament_id === filters.filterTournament);
    }
    if (filters.filterSeason !== 'all') {
      result = result.filter((m) => m.season_id === filters.filterSeason);
    }

    const query = filters.matchSearch.trim().toLowerCase();
    if (!query) return result;

    return result.filter((m) => {
      const tournamentName = tournaments.find((t) => t.tournament_id === m.tournament_id)?.name?.toLowerCase() || '';
      return [m.match_id, m.team_a, m.team_b, m.venue, m.result, tournamentName].some((value) =>
        value?.toLowerCase().includes(query),
      );
    });
  }, [filters, latestMatches, matches, tournaments]);

  return { latestMatches, relevantSeasons, filteredMatchIds, displayMatches };
}

export function useLeaderboardData(filters: { filterTournament: string; filterSeason: string }) {
  const { data: matches = [] } = useMatchesQuery();
  const { data: batting = [] } = useBattingQuery();
  const { data: bowling = [] } = useBowlingQuery();

  const filteredMatches = useMemo(() => {
    let filtered = matches;
    if (filters.filterTournament !== 'all') {
      filtered = filtered.filter((m) => m.tournament_id === filters.filterTournament);
    }
    if (filters.filterSeason !== 'all') {
      filtered = filtered.filter((m) => m.season_id === filters.filterSeason);
    }
    return filtered;
  }, [matches, filters.filterTournament, filters.filterSeason]);

  const matchIds = useMemo(() => new Set(filteredMatches.map((m) => m.match_id)), [filteredMatches]);

  const filteredBatting = useMemo(() => batting.filter((b) => matchIds.has(b.match_id)), [batting, matchIds]);
  const filteredBowling = useMemo(() => bowling.filter((b) => matchIds.has(b.match_id)), [bowling, matchIds]);

  const battingLeaderboard = useMemo(() => {
    const grouped = filteredBatting.reduce<Record<string, typeof filteredBatting>>((acc, entry) => {
      if (!acc[entry.player_id]) acc[entry.player_id] = [];
      acc[entry.player_id].push(entry);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([player_id, entries]) => ({ player_id, ...calcBattingStats(entries) }))
      .filter((row) => (row.totalRuns || 0) > 0)
      .sort((a, b) => (b.totalRuns || 0) - (a.totalRuns || 0));
  }, [filteredBatting]);

  const bowlingLeaderboard = useMemo(() => {
    const grouped = filteredBowling.reduce<Record<string, typeof filteredBowling>>((acc, entry) => {
      if (!acc[entry.player_id]) acc[entry.player_id] = [];
      acc[entry.player_id].push(entry);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([player_id, entries]) => ({ player_id, ...calcBowlingStats(entries) }))
      .filter((row) => (row.totalWickets || 0) > 0)
      .sort((a, b) => (b.totalWickets || 0) - (a.totalWickets || 0));
  }, [filteredBowling]);

  return { filteredMatches, filteredBatting, filteredBowling, battingLeaderboard, bowlingLeaderboard };
}


export function useScorelistsQuery({ refresh = false }: { refresh?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.scorelists,
    queryFn: () => v2api.getScorelists(),
    refetchInterval: refresh ? 15_000 : false,
    refetchIntervalInBackground: refresh,
  });
}

export function useCertificatesQuery({ refresh = false }: { refresh?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.certificates,
    queryFn: () => v2api.getCertificates(),
    refetchInterval: refresh ? 30_000 : false,
    refetchIntervalInBackground: refresh,
  });
}

export function useSupportTicketsQuery({ refresh = false }: { refresh?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.supportTickets,
    queryFn: () => v2api.getTickets(),
    refetchInterval: refresh ? 15_000 : false,
    refetchIntervalInBackground: refresh,
  });
}

export function useAuditEventsQuery({ refresh = false }: { refresh?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.auditEvents,
    queryFn: () => v2api.getAuditEvents(),
    refetchInterval: refresh ? 20_000 : false,
    refetchIntervalInBackground: refresh,
  });
}

export function useAdminOpsCenterData() {
  return useQuery({
    queryKey: ['admin', 'ops-center'],
    queryFn: async () => {
      const [matches, timeline, scorelists, certificates, tickets, auditEvents] = await Promise.all([
        api.getMatches(),
        v2api.getMatchTimeline(),
        v2api.getScorelists(),
        v2api.getCertificates(),
        v2api.getTickets(),
        v2api.getAuditEvents(),
      ]);

      return { matches, timeline, scorelists, certificates, tickets, auditEvents };
    },
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
  });
}

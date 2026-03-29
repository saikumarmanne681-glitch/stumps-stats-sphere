import React, { createContext, useContext, useMemo, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Player, Tournament, Season, Match, BattingScorecard, BowlingScorecard, Announcement, Message } from './types';
import { api, isConnected } from './googleSheets';
import { logAudit, v2api } from './v2api';
import {
  useAnnouncementsQuery,
  useBattingQuery,
  useBowlingQuery,
  useMatchesQuery,
  useMessagesQuery,
  usePlayersQuery,
  useSeasonsQuery,
  useTournamentsQuery,
} from './dataHooks';
import { queryKeys } from './queryKeys';

interface DataState {
  players: Player[];
  tournaments: Tournament[];
  seasons: Season[];
  matches: Match[];
  batting: BattingScorecard[];
  bowling: BowlingScorecard[];
  announcements: Announcement[];
  messages: Message[];
  loading: boolean;
  lastRefresh: Date | null;
}

interface DataContextType extends DataState {
  refresh: () => Promise<void>;
  addPlayer: (p: Player) => Promise<void>;
  updatePlayer: (p: Player) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
  addTournament: (t: Tournament) => Promise<void>;
  updateTournament: (t: Tournament) => Promise<void>;
  deleteTournament: (id: string) => Promise<void>;
  addSeason: (s: Season) => Promise<void>;
  updateSeason: (s: Season) => Promise<void>;
  deleteSeason: (id: string) => Promise<void>;
  addMatch: (m: Match) => Promise<void>;
  updateMatch: (m: Match) => Promise<void>;
  deleteMatch: (id: string) => Promise<void>;
  addBattingEntry: (b: BattingScorecard) => Promise<void>;
  updateBattingEntry: (b: BattingScorecard) => Promise<void>;
  deleteBattingEntry: (id: string, matchId?: string) => Promise<void>;
  addBowlingEntry: (b: BowlingScorecard) => Promise<void>;
  updateBowlingEntry: (b: BowlingScorecard) => Promise<void>;
  deleteBowlingEntry: (id: string, matchId?: string) => Promise<void>;
  addAnnouncement: (a: Announcement) => Promise<void>;
  updateAnnouncement: (a: Announcement) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  addMessage: (m: Message) => Promise<void>;
  updateMessage: (m: Message) => Promise<void>;
  saveScorecardBulk: (
    matchId: string,
    newBatting: BattingScorecard[],
    newBowling: BowlingScorecard[],
    expectedState?: { scorecardVersion?: number; scorecardChecksum?: string },
  ) => Promise<{ operationId: string; scorecardVersion: number; scorecardChecksum: string }>;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const playersQuery = usePlayersQuery();
  const tournamentsQuery = useTournamentsQuery();
  const seasonsQuery = useSeasonsQuery();
  const matchesQuery = useMatchesQuery();
  const battingQuery = useBattingQuery();
  const bowlingQuery = useBowlingQuery();
  const announcementsQuery = useAnnouncementsQuery();
  const messagesQuery = useMessagesQuery();

  useEffect(() => {
    v2api.syncHeaders().catch(console.warn);
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.players }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments }),
      queryClient.invalidateQueries({ queryKey: queryKeys.seasons }),
      queryClient.invalidateQueries({ queryKey: queryKeys.matches }),
      queryClient.invalidateQueries({ queryKey: queryKeys.batting }),
      queryClient.invalidateQueries({ queryKey: queryKeys.bowling }),
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements }),
      queryClient.invalidateQueries({ queryKey: queryKeys.messages }),
    ]);
  }, [queryClient]);

  const invalidateKeys = useCallback(
    async (keys: readonly unknown[][]) => {
      await Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: key })));
    },
    [queryClient],
  );

  const mutate = useCallback(
    async (
      apiFn: () => Promise<boolean>,
      invalidateAfter: readonly unknown[][],
      audit?: { actor: string; eventType: string; entityType: string; entityId: string; metadata?: string },
    ) => {
      const success = await apiFn();
      if (!success) return;
      if (audit) {
        logAudit(audit.actor, audit.eventType, audit.entityType, audit.entityId, audit.metadata || '');
      }
      if (isConnected()) {
        await invalidateKeys(invalidateAfter);
      }
    },
    [invalidateKeys],
  );

  const loading = [
    playersQuery.isLoading,
    tournamentsQuery.isLoading,
    seasonsQuery.isLoading,
    matchesQuery.isLoading,
    battingQuery.isLoading,
    bowlingQuery.isLoading,
    announcementsQuery.isLoading,
    messagesQuery.isLoading,
  ].some(Boolean);

  const updatedAt = Math.max(
    playersQuery.dataUpdatedAt || 0,
    tournamentsQuery.dataUpdatedAt || 0,
    seasonsQuery.dataUpdatedAt || 0,
    matchesQuery.dataUpdatedAt || 0,
    battingQuery.dataUpdatedAt || 0,
    bowlingQuery.dataUpdatedAt || 0,
    announcementsQuery.dataUpdatedAt || 0,
    messagesQuery.dataUpdatedAt || 0,
  );

  const state: DataState = {
    players: playersQuery.data || [],
    tournaments: tournamentsQuery.data || [],
    seasons: seasonsQuery.data || [],
    matches: matchesQuery.data || [],
    batting: battingQuery.data || [],
    bowling: bowlingQuery.data || [],
    announcements: announcementsQuery.data || [],
    messages: messagesQuery.data || [],
    loading,
    lastRefresh: updatedAt ? new Date(updatedAt) : null,
  };

  const ctx = useMemo<DataContextType>(
    () => ({
      ...state,
      refresh,
      addPlayer: async (p) =>
        mutate(
          () => api.addPlayer(p),
          [queryKeys.players],
          { actor: 'system', eventType: 'add_player', entityType: 'player', entityId: p.player_id, metadata: JSON.stringify({ name: p.name, role: p.role, status: p.status }) },
        ),
      updatePlayer: async (p) =>
        mutate(
          () => api.updatePlayer(p),
          [queryKeys.players],
          { actor: 'system', eventType: 'update_player', entityType: 'player', entityId: p.player_id, metadata: JSON.stringify({ name: p.name, role: p.role, status: p.status }) },
        ),
      deletePlayer: async (id) =>
        mutate(
          () => api.deletePlayer(id),
          [queryKeys.players],
          { actor: 'system', eventType: 'delete_player', entityType: 'player', entityId: id },
        ),
      addTournament: async (t) =>
        mutate(
          () => api.addTournament(t),
          [queryKeys.tournaments],
          { actor: 'system', eventType: 'add_tournament', entityType: 'tournament', entityId: t.tournament_id, metadata: JSON.stringify({ name: t.name, format: t.format, overs: t.overs }) },
        ),
      updateTournament: async (t) =>
        mutate(
          () => api.updateTournament(t),
          [queryKeys.tournaments],
          { actor: 'system', eventType: 'update_tournament', entityType: 'tournament', entityId: t.tournament_id, metadata: JSON.stringify({ name: t.name, format: t.format, overs: t.overs }) },
        ),
      deleteTournament: async (id) =>
        mutate(
          () => api.deleteTournament(id),
          [queryKeys.tournaments],
          { actor: 'system', eventType: 'delete_tournament', entityType: 'tournament', entityId: id },
        ),
      addSeason: async (s) =>
        mutate(
          () => api.addSeason(s),
          [queryKeys.seasons],
          { actor: 'system', eventType: 'add_season', entityType: 'season', entityId: s.season_id, metadata: JSON.stringify({ year: s.year, tournamentId: s.tournament_id, status: s.status }) },
        ),
      updateSeason: async (s) =>
        mutate(
          () => api.updateSeason(s),
          [queryKeys.seasons],
          { actor: 'system', eventType: 'update_season', entityType: 'season', entityId: s.season_id, metadata: JSON.stringify({ year: s.year, tournamentId: s.tournament_id, status: s.status }) },
        ),
      deleteSeason: async (id) =>
        mutate(
          () => api.deleteSeason(id),
          [queryKeys.seasons],
          { actor: 'system', eventType: 'delete_season', entityType: 'season', entityId: id },
        ),
      addMatch: async (m) =>
        mutate(
          () => api.addMatch(m),
          [queryKeys.matches, queryKeys.match(m.match_id)],
          { actor: 'system', eventType: 'add_match', entityType: 'match', entityId: m.match_id, metadata: JSON.stringify({ teams: `${m.team_a} vs ${m.team_b}`, status: m.status, matchStage: m.match_stage || '' }) },
        ),
      updateMatch: async (m) =>
        mutate(
          () => api.updateMatch(m),
          [queryKeys.matches, queryKeys.match(m.match_id)],
          { actor: 'system', eventType: 'update_match', entityType: 'match', entityId: m.match_id, metadata: JSON.stringify({ teams: `${m.team_a} vs ${m.team_b}`, status: m.status, matchStage: m.match_stage || '', result: m.result || '' }) },
        ),
      deleteMatch: async (id) =>
        mutate(
          () => api.deleteMatch(id),
          [queryKeys.matches, queryKeys.match(id), queryKeys.batting, queryKeys.bowling],
          { actor: 'system', eventType: 'delete_match', entityType: 'match', entityId: id },
        ),
      addBattingEntry: async (b) => mutate(() => api.addBattingEntry(b), [queryKeys.batting, queryKeys.battingByMatch(b.match_id), queryKeys.matches]),
      updateBattingEntry: async (b) => mutate(() => api.updateBattingEntry(b), [queryKeys.batting, queryKeys.battingByMatch(b.match_id), queryKeys.matches]),
      deleteBattingEntry: async (id, matchId) => mutate(() => api.deleteBattingEntry(id), [queryKeys.batting, ...(matchId ? [queryKeys.battingByMatch(matchId)] : []), queryKeys.matches]),
      addBowlingEntry: async (b) => mutate(() => api.addBowlingEntry(b), [queryKeys.bowling, queryKeys.bowlingByMatch(b.match_id), queryKeys.matches]),
      updateBowlingEntry: async (b) => mutate(() => api.updateBowlingEntry(b), [queryKeys.bowling, queryKeys.bowlingByMatch(b.match_id), queryKeys.matches]),
      deleteBowlingEntry: async (id, matchId) => mutate(() => api.deleteBowlingEntry(id), [queryKeys.bowling, ...(matchId ? [queryKeys.bowlingByMatch(matchId)] : []), queryKeys.matches]),
      addAnnouncement: async (a) =>
        mutate(
          () => api.addAnnouncement(a),
          [queryKeys.announcements],
          { actor: a.created_by || 'admin', eventType: 'add_announcement', entityType: 'announcement', entityId: a.id, metadata: JSON.stringify({ title: a.title, active: a.active }) },
        ),
      updateAnnouncement: async (a) =>
        mutate(
          () => api.updateAnnouncement(a),
          [queryKeys.announcements],
          { actor: a.created_by || 'admin', eventType: 'update_announcement', entityType: 'announcement', entityId: a.id, metadata: JSON.stringify({ title: a.title, active: a.active }) },
        ),
      deleteAnnouncement: async (id) =>
        mutate(
          () => api.deleteAnnouncement(id),
          [queryKeys.announcements],
          { actor: 'admin', eventType: 'delete_announcement', entityType: 'announcement', entityId: id },
        ),
      addMessage: async (m) =>
        mutate(
          () => api.addMessage(m),
          [queryKeys.messages],
          { actor: m.from_id || 'system', eventType: 'add_message', entityType: 'message', entityId: m.id, metadata: JSON.stringify({ to: m.to_id, subject: m.subject, replyTo: m.reply_to || '' }) },
        ),
      updateMessage: async (m) =>
        mutate(
          () => api.updateMessage(m),
          [queryKeys.messages],
          { actor: m.from_id || 'system', eventType: 'update_message', entityType: 'message', entityId: m.id, metadata: JSON.stringify({ to: m.to_id, read: m.read, replyTo: m.reply_to || '' }) },
        ),
      saveScorecardBulk: async (matchId, newBatting, newBowling, expectedState) => {
        const existingMatch = state.matches.find((m) => m.match_id === matchId);
        const replacement = await api.replaceScorecardAtomic({
          match_id: matchId,
          expected_scorecard_version: expectedState?.scorecardVersion ?? existingMatch?.scorecard_version ?? 0,
          expected_scorecard_checksum: expectedState?.scorecardChecksum ?? existingMatch?.scorecard_checksum ?? '',
          batting_entries: newBatting,
          bowling_entries: newBowling,
        });

        if (!replacement.success) {
          throw new Error(replacement.error || 'Atomic scorecard replace failed');
        }

        logAudit('system', 'save_scorecard_bulk', 'match', matchId, JSON.stringify({
          battingEntries: newBatting.length,
          bowlingEntries: newBowling.length,
          operation_id: replacement.operation_id,
          scorecard_version: replacement.scorecard_version,
          scorecard_checksum: replacement.scorecard_checksum,
        }));

        queryClient.setQueryData<Match[]>(queryKeys.matches, (current) =>
          (current || []).map((item) =>
            item.match_id === matchId
              ? {
                  ...item,
                  scorecard_version: replacement.scorecard_version,
                  scorecard_checksum: replacement.scorecard_checksum,
                  scorecard_operation_id: replacement.operation_id,
                }
              : item,
          ),
        );
        queryClient.setQueryData<BattingScorecard[]>(queryKeys.batting, (current) => [
          ...(current || []).filter((row) => row.match_id !== matchId),
          ...newBatting,
        ]);
        queryClient.setQueryData<BattingScorecard[]>(queryKeys.battingByMatch(matchId), newBatting);
        queryClient.setQueryData<BowlingScorecard[]>(queryKeys.bowling, (current) => [
          ...(current || []).filter((row) => row.match_id !== matchId),
          ...newBowling,
        ]);
        queryClient.setQueryData<BowlingScorecard[]>(queryKeys.bowlingByMatch(matchId), newBowling);

        void invalidateKeys([
          queryKeys.matches,
          queryKeys.match(matchId),
          queryKeys.batting,
          queryKeys.battingByMatch(matchId),
          queryKeys.bowling,
          queryKeys.bowlingByMatch(matchId),
        ]);

        return {
          operationId: replacement.operation_id,
          scorecardVersion: replacement.scorecard_version,
          scorecardChecksum: replacement.scorecard_checksum,
        };
      },
    }),
    [invalidateKeys, mutate, queryClient, refresh, state],
  );

  return <DataContext.Provider value={ctx}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);

  if (ctx === null) {
    console.warn('DataContext not ready yet');
    return {
      players: [],
      tournaments: [],
      seasons: [],
      matches: [],
      batting: [],
      bowling: [],
      announcements: [],
      messages: [],
      loading: true,
      lastRefresh: null,
      refresh: async () => {},
      addPlayer: async () => {},
      updatePlayer: async () => {},
      deletePlayer: async () => {},
      addTournament: async () => {},
      updateTournament: async () => {},
      deleteTournament: async () => {},
      addSeason: async () => {},
      updateSeason: async () => {},
      deleteSeason: async () => {},
      addMatch: async () => {},
      updateMatch: async () => {},
      deleteMatch: async () => {},
      addBattingEntry: async () => {},
      updateBattingEntry: async () => {},
      deleteBattingEntry: async () => {},
      addBowlingEntry: async () => {},
      updateBowlingEntry: async () => {},
      deleteBowlingEntry: async () => {},
      addAnnouncement: async () => {},
      updateAnnouncement: async () => {},
      deleteAnnouncement: async () => {},
      addMessage: async () => {},
      updateMessage: async () => {},
      saveScorecardBulk: async (_matchId, _newBatting, _newBowling, _expectedState) => ({ operationId: "", scorecardVersion: 0, scorecardChecksum: "" }),
    } as DataContextType;
  }

  return ctx;
}

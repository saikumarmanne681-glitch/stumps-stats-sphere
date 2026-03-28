import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { Player, Tournament, Season, Match, BattingScorecard, BowlingScorecard, Announcement, Message } from "./types";
import { api, isConnected } from "./googleSheets";
import { logAudit, v2api } from "./v2api";

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
  // Players
  addPlayer: (p: Player) => Promise<void>;
  updatePlayer: (p: Player) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
  // Tournaments
  addTournament: (t: Tournament) => Promise<void>;
  updateTournament: (t: Tournament) => Promise<void>;
  deleteTournament: (id: string) => Promise<void>;
  // Seasons
  addSeason: (s: Season) => Promise<void>;
  updateSeason: (s: Season) => Promise<void>;
  deleteSeason: (id: string) => Promise<void>;
  // Matches
  addMatch: (m: Match) => Promise<void>;
  updateMatch: (m: Match) => Promise<void>;
  deleteMatch: (id: string) => Promise<void>;
  // Batting
  addBattingEntry: (b: BattingScorecard) => Promise<void>;
  updateBattingEntry: (b: BattingScorecard) => Promise<void>;
  deleteBattingEntry: (id: string) => Promise<void>;
  // Bowling
  addBowlingEntry: (b: BowlingScorecard) => Promise<void>;
  updateBowlingEntry: (b: BowlingScorecard) => Promise<void>;
  deleteBowlingEntry: (id: string) => Promise<void>;
  // Announcements
  addAnnouncement: (a: Announcement) => Promise<void>;
  updateAnnouncement: (a: Announcement) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  // Messages
  addMessage: (m: Message) => Promise<void>;
  updateMessage: (m: Message) => Promise<void>;
  // Bulk scorecard save
  saveScorecardBulk: (
    matchId: string,
    newBatting: BattingScorecard[],
    newBowling: BowlingScorecard[],
    expected?: { scorecardVersion?: number; scorecardChecksum?: string },
  ) => Promise<{ operationId: string; scorecardVersion: number; scorecardChecksum: string }>;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DataState>({
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
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    const results = await Promise.allSettled([
      api.getPlayers(),
      api.getTournaments(),
      api.getSeasons(),
      api.getMatches(),
      api.getBattingScorecard(),
      api.getBowlingScorecard(),
      api.getAnnouncements(),
      api.getMessages(),
    ]);

    setState((prev) => {
      const nextState: DataState = {
        ...prev,
        loading: false,
        lastRefresh: new Date(),
      };

      const [players, tournaments, seasons, matches, batting, bowling, announcements, messages] = results;

      if (players.status === "fulfilled") nextState.players = players.value;
      else console.error("Data refresh failed for players:", players.reason);

      if (tournaments.status === "fulfilled") nextState.tournaments = tournaments.value;
      else console.error("Data refresh failed for tournaments:", tournaments.reason);

      if (seasons.status === "fulfilled") nextState.seasons = seasons.value;
      else console.error("Data refresh failed for seasons:", seasons.reason);

      if (matches.status === "fulfilled") nextState.matches = matches.value;
      else console.error("Data refresh failed for matches:", matches.reason);

      if (batting.status === "fulfilled") nextState.batting = batting.value;
      else console.error("Data refresh failed for batting:", batting.reason);

      if (bowling.status === "fulfilled") nextState.bowling = bowling.value;
      else console.error("Data refresh failed for bowling:", bowling.reason);

      if (announcements.status === "fulfilled") nextState.announcements = announcements.value;
      else console.error("Data refresh failed for announcements:", announcements.reason);

      if (messages.status === "fulfilled") nextState.messages = messages.value;
      else console.error("Data refresh failed for messages:", messages.reason);

      return nextState;
    });
  }, []);

  useEffect(() => {
    v2api.syncHeaders().catch(console.warn);
    refresh();
    intervalRef.current = setInterval(refresh, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  // Helper: optimistic update + API call + refresh
  const mutate = useCallback(
    async (
      apiFn: () => Promise<boolean>,
      optimisticUpdate: (prev: DataState) => DataState,
      audit?: { actor: string; eventType: string; entityType: string; entityId: string; metadata?: string },
    ) => {
      setState((prev) => optimisticUpdate(prev));
      const success = await apiFn();
      if (success && audit) {
        logAudit(audit.actor, audit.eventType, audit.entityType, audit.entityId, audit.metadata || '');
      }
      if (isConnected() && success) {
        // Refresh from server after a short delay to let sheet update
        setTimeout(refresh, 500);
      }
    },
    [refresh],
  );

  const ctx: DataContextType = {
    ...state,
    refresh,

    // Players
    addPlayer: async (p) =>
      mutate(
        () => api.addPlayer(p),
        (prev) => ({ ...prev, players: [...prev.players, p] }),
        { actor: "system", eventType: "add_player", entityType: "player", entityId: p.player_id, metadata: JSON.stringify({ name: p.name, role: p.role, status: p.status }) },
      ),
    updatePlayer: async (p) =>
      mutate(
        () => api.updatePlayer(p),
        (prev) => ({ ...prev, players: prev.players.map((x) => (x.player_id === p.player_id ? p : x)) }),
        { actor: "system", eventType: "update_player", entityType: "player", entityId: p.player_id, metadata: JSON.stringify({ name: p.name, role: p.role, status: p.status }) },
      ),
    deletePlayer: async (id) =>
      mutate(
        () => api.deletePlayer(id),
        (prev) => ({ ...prev, players: prev.players.filter((x) => x.player_id !== id) }),
        { actor: "system", eventType: "delete_player", entityType: "player", entityId: id },
      ),

    // Tournaments
    addTournament: async (t) =>
      mutate(
        () => api.addTournament(t),
        (prev) => ({ ...prev, tournaments: [...prev.tournaments, t] }),
        { actor: "system", eventType: "add_tournament", entityType: "tournament", entityId: t.tournament_id, metadata: JSON.stringify({ name: t.name, format: t.format, overs: t.overs }) },
      ),
    updateTournament: async (t) =>
      mutate(
        () => api.updateTournament(t),
        (prev) => ({
          ...prev,
          tournaments: prev.tournaments.map((x) => (x.tournament_id === t.tournament_id ? t : x)),
        }),
        { actor: "system", eventType: "update_tournament", entityType: "tournament", entityId: t.tournament_id, metadata: JSON.stringify({ name: t.name, format: t.format, overs: t.overs }) },
      ),
    deleteTournament: async (id) =>
      mutate(
        () => api.deleteTournament(id),
        (prev) => ({ ...prev, tournaments: prev.tournaments.filter((x) => x.tournament_id !== id) }),
        { actor: "system", eventType: "delete_tournament", entityType: "tournament", entityId: id },
      ),

    // Seasons
    addSeason: async (s) =>
      mutate(
        () => api.addSeason(s),
        (prev) => ({ ...prev, seasons: [...prev.seasons, s] }),
        { actor: "system", eventType: "add_season", entityType: "season", entityId: s.season_id, metadata: JSON.stringify({ year: s.year, tournamentId: s.tournament_id, status: s.status }) },
      ),
    updateSeason: async (s) =>
      mutate(
        () => api.updateSeason(s),
        (prev) => ({ ...prev, seasons: prev.seasons.map((x) => (x.season_id === s.season_id ? s : x)) }),
        { actor: "system", eventType: "update_season", entityType: "season", entityId: s.season_id, metadata: JSON.stringify({ year: s.year, tournamentId: s.tournament_id, status: s.status }) },
      ),
    deleteSeason: async (id) =>
      mutate(
        () => api.deleteSeason(id),
        (prev) => ({ ...prev, seasons: prev.seasons.filter((x) => x.season_id !== id) }),
        { actor: "system", eventType: "delete_season", entityType: "season", entityId: id },
      ),

    // Matches
    addMatch: async (m) =>
      mutate(
        () => api.addMatch(m),
        (prev) => ({ ...prev, matches: [...prev.matches, m] }),
        { actor: "system", eventType: "add_match", entityType: "match", entityId: m.match_id, metadata: JSON.stringify({ teams: `${m.team_a} vs ${m.team_b}`, status: m.status, matchStage: m.match_stage || "" }) },
      ),
    updateMatch: async (m) =>
      mutate(
        () => api.updateMatch(m),
        (prev) => ({ ...prev, matches: prev.matches.map((x) => (x.match_id === m.match_id ? m : x)) }),
        { actor: "system", eventType: "update_match", entityType: "match", entityId: m.match_id, metadata: JSON.stringify({ teams: `${m.team_a} vs ${m.team_b}`, status: m.status, matchStage: m.match_stage || "", result: m.result || "" }) },
      ),
    deleteMatch: async (id) =>
      mutate(
        () => api.deleteMatch(id),
        (prev) => ({ ...prev, matches: prev.matches.filter((x) => x.match_id !== id) }),
        { actor: "system", eventType: "delete_match", entityType: "match", entityId: id },
      ),

    // Batting
    addBattingEntry: async (b) =>
      mutate(
        () => api.addBattingEntry(b),
        (prev) => ({ ...prev, batting: [...prev.batting, b] }),
      ),
    updateBattingEntry: async (b) =>
      mutate(
        () => api.updateBattingEntry(b),
        (prev) => ({ ...prev, batting: prev.batting.map((x) => (x.id === b.id ? b : x)) }),
      ),
    deleteBattingEntry: async (id) =>
      mutate(
        () => api.deleteBattingEntry(id),
        (prev) => ({ ...prev, batting: prev.batting.filter((x) => x.id !== id) }),
      ),

    // Bowling
    addBowlingEntry: async (b) =>
      mutate(
        () => api.addBowlingEntry(b),
        (prev) => ({ ...prev, bowling: [...prev.bowling, b] }),
      ),
    updateBowlingEntry: async (b) =>
      mutate(
        () => api.updateBowlingEntry(b),
        (prev) => ({ ...prev, bowling: prev.bowling.map((x) => (x.id === b.id ? b : x)) }),
      ),
    deleteBowlingEntry: async (id) =>
      mutate(
        () => api.deleteBowlingEntry(id),
        (prev) => ({ ...prev, bowling: prev.bowling.filter((x) => x.id !== id) }),
      ),

    // Announcements
    addAnnouncement: async (a) =>
      mutate(
        () => api.addAnnouncement(a),
        (prev) => ({ ...prev, announcements: [...prev.announcements, a] }),
        { actor: a.created_by || "admin", eventType: "add_announcement", entityType: "announcement", entityId: a.id, metadata: JSON.stringify({ title: a.title, active: a.active }) },
      ),
    updateAnnouncement: async (a) =>
      mutate(
        () => api.updateAnnouncement(a),
        (prev) => ({ ...prev, announcements: prev.announcements.map((x) => (x.id === a.id ? a : x)) }),
        { actor: a.created_by || "admin", eventType: "update_announcement", entityType: "announcement", entityId: a.id, metadata: JSON.stringify({ title: a.title, active: a.active }) },
      ),
    deleteAnnouncement: async (id) =>
      mutate(
        () => api.deleteAnnouncement(id),
        (prev) => ({ ...prev, announcements: prev.announcements.filter((x) => x.id !== id) }),
        { actor: "admin", eventType: "delete_announcement", entityType: "announcement", entityId: id },
      ),

    // Messages
    addMessage: async (m) =>
      mutate(
        () => api.addMessage(m),
        (prev) => ({ ...prev, messages: [...prev.messages, m] }),
        { actor: m.from_id || "system", eventType: "add_message", entityType: "message", entityId: m.id, metadata: JSON.stringify({ to: m.to_id, subject: m.subject, replyTo: m.reply_to || "" }) },
      ),
    updateMessage: async (m) =>
      mutate(
        () => api.updateMessage(m),
        (prev) => ({ ...prev, messages: prev.messages.map((x) => (x.id === m.id ? m : x)) }),
        { actor: m.from_id || "system", eventType: "update_message", entityType: "message", entityId: m.id, metadata: JSON.stringify({ to: m.to_id, read: m.read, replyTo: m.reply_to || "" }) },
      ),

    // Bulk scorecard
    saveScorecardBulk: async (matchId, newBatting, newBowling, expected) => {
      const result = await api.replaceScorecardAtomic({
        match_id: matchId,
        expected_scorecard_version: expected?.scorecardVersion,
        expected_scorecard_checksum: expected?.scorecardChecksum,
        batting_entries: newBatting,
        bowling_entries: newBowling,
      });

      if (!result.success) {
        const retryGuidance = result.retry_guidance || "Please refresh the match, review latest scorecard edits, and retry save.";
        const suffix = result.partial_write ? " Partial write was detected and rolled back by server." : "";
        throw new Error(`${result.error || "Atomic scorecard save failed."} ${retryGuidance}${suffix}`);
      }

      setState((prev) => ({
        ...prev,
        batting: [...prev.batting.filter((b) => b.match_id !== matchId), ...newBatting],
        bowling: [...prev.bowling.filter((b) => b.match_id !== matchId), ...newBowling],
        matches: prev.matches.map((m) =>
          m.match_id === matchId
            ? { ...m, scorecard_version: result.scorecard_version, scorecard_checksum: result.scorecard_checksum, scorecard_operation_id: result.operation_id }
            : m,
        ),
      }));

      logAudit(
        "system",
        "save_scorecard_bulk_atomic",
        "match",
        matchId,
        JSON.stringify({
          battingEntries: newBatting.length,
          bowlingEntries: newBowling.length,
          atomicOperationId: result.operation_id,
          scorecardVersion: result.scorecard_version,
          scorecardChecksum: result.scorecard_checksum,
        }),
      );

      if (isConnected()) setTimeout(refresh, 1000);
      return {
        operationId: result.operation_id,
        scorecardVersion: result.scorecard_version,
        scorecardChecksum: result.scorecard_checksum,
      };
    },
  };

  return <DataContext.Provider value={ctx}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);

  if (ctx === null) {
    console.warn("DataContext not ready yet");
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
      saveScorecardBulk: async () => ({ operationId: "", scorecardVersion: 0, scorecardChecksum: "" }),
    } as DataContextType;
  }

  return ctx;
}

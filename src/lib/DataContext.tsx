import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { Player, Tournament, Season, Match, BattingScorecard, BowlingScorecard, Announcement, Message } from "./types";
import { api, isConnected } from "./googleSheets";

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
  saveScorecardBulk: (matchId: string, newBatting: BattingScorecard[], newBowling: BowlingScorecard[]) => Promise<void>;
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
    try {
      const [players, tournaments, seasons, matches, batting, bowling, announcements, messages] = await Promise.all([
        api.getPlayers(),
        api.getTournaments(),
        api.getSeasons(),
        api.getMatches(),
        api.getBattingScorecard(),
        api.getBowlingScorecard(),
        api.getAnnouncements(),
        api.getMessages(),
      ]);
      setState({
        players,
        tournaments,
        seasons,
        matches,
        batting,
        bowling,
        announcements,
        messages,
        loading: false,
        lastRefresh: new Date(),
      });
    } catch (err) {
      console.error("Data refresh failed:", err);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  // Helper: optimistic update + API call + refresh
  const mutate = useCallback(
    async (apiFn: () => Promise<boolean>, optimisticUpdate: (prev: DataState) => DataState) => {
      setState((prev) => optimisticUpdate(prev));
      const success = await apiFn();
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
      ),
    updatePlayer: async (p) =>
      mutate(
        () => api.updatePlayer(p),
        (prev) => ({ ...prev, players: prev.players.map((x) => (x.player_id === p.player_id ? p : x)) }),
      ),
    deletePlayer: async (id) =>
      mutate(
        () => api.deletePlayer(id),
        (prev) => ({ ...prev, players: prev.players.filter((x) => x.player_id !== id) }),
      ),

    // Tournaments
    addTournament: async (t) =>
      mutate(
        () => api.addTournament(t),
        (prev) => ({ ...prev, tournaments: [...prev.tournaments, t] }),
      ),
    updateTournament: async (t) =>
      mutate(
        () => api.updateTournament(t),
        (prev) => ({
          ...prev,
          tournaments: prev.tournaments.map((x) => (x.tournament_id === t.tournament_id ? t : x)),
        }),
      ),
    deleteTournament: async (id) =>
      mutate(
        () => api.deleteTournament(id),
        (prev) => ({ ...prev, tournaments: prev.tournaments.filter((x) => x.tournament_id !== id) }),
      ),

    // Seasons
    addSeason: async (s) =>
      mutate(
        () => api.addSeason(s),
        (prev) => ({ ...prev, seasons: [...prev.seasons, s] }),
      ),
    updateSeason: async (s) =>
      mutate(
        () => api.updateSeason(s),
        (prev) => ({ ...prev, seasons: prev.seasons.map((x) => (x.season_id === s.season_id ? s : x)) }),
      ),
    deleteSeason: async (id) =>
      mutate(
        () => api.deleteSeason(id),
        (prev) => ({ ...prev, seasons: prev.seasons.filter((x) => x.season_id !== id) }),
      ),

    // Matches
    addMatch: async (m) =>
      mutate(
        () => api.addMatch(m),
        (prev) => ({ ...prev, matches: [...prev.matches, m] }),
      ),
    updateMatch: async (m) =>
      mutate(
        () => api.updateMatch(m),
        (prev) => ({ ...prev, matches: prev.matches.map((x) => (x.match_id === m.match_id ? m : x)) }),
      ),
    deleteMatch: async (id) =>
      mutate(
        () => api.deleteMatch(id),
        (prev) => ({ ...prev, matches: prev.matches.filter((x) => x.match_id !== id) }),
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
      ),
    updateAnnouncement: async (a) =>
      mutate(
        () => api.updateAnnouncement(a),
        (prev) => ({ ...prev, announcements: prev.announcements.map((x) => (x.id === a.id ? a : x)) }),
      ),
    deleteAnnouncement: async (id) =>
      mutate(
        () => api.deleteAnnouncement(id),
        (prev) => ({ ...prev, announcements: prev.announcements.filter((x) => x.id !== id) }),
      ),

    // Messages
    addMessage: async (m) =>
      mutate(
        () => api.addMessage(m),
        (prev) => ({ ...prev, messages: [...prev.messages, m] }),
      ),
    updateMessage: async (m) =>
      mutate(
        () => api.updateMessage(m),
        (prev) => ({ ...prev, messages: prev.messages.map((x) => (x.id === m.id ? m : x)) }),
      ),

    // Bulk scorecard
    saveScorecardBulk: async (matchId, newBatting, newBowling) => {
      // Delete old entries for this match, then add new ones.
      // Fetch latest from backend first to avoid duplicates on repeated/rapid saves.
      const sourceBatting = isConnected() ? await api.getBattingScorecard() : state.batting;
      const sourceBowling = isConnected() ? await api.getBowlingScorecard() : state.bowling;

      const oldBat = sourceBatting.filter((b) => b.match_id === matchId);
      const oldBowl = sourceBowling.filter((b) => b.match_id === matchId);

      for (const b of oldBat) await api.deleteBattingEntry(b.id);
      for (const b of oldBowl) await api.deleteBowlingEntry(b.id);
      for (const b of newBatting) await api.addBattingEntry(b);
      for (const b of newBowling) await api.addBowlingEntry(b);

      setState((prev) => ({
        ...prev,
        batting: [...prev.batting.filter((b) => b.match_id !== matchId), ...newBatting],
        bowling: [...prev.bowling.filter((b) => b.match_id !== matchId), ...newBowling],
      }));

      if (isConnected()) setTimeout(refresh, 1000);
    },
  };

  return <DataContext.Provider value={ctx}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

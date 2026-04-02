import { Player, Tournament, Season, Match, BattingScorecard, BowlingScorecard, Announcement, Message, ScorecardReplaceRequest, ScorecardReplaceResult } from "./types";
import { normalizeSheetRows } from "./dataUtils";
import { getEnvStorageKey } from "./environment";
import {
  mockPlayers,
  mockTournaments,
  mockSeasons,
  mockMatches,
  mockBattingScorecard,
  mockBowlingScorecard,
  mockAnnouncements,
  mockMessages,
} from "./mockData";

// Each environment stores its own Apps Script URL automatically
const STORAGE_KEY = getEnvStorageKey("appsScriptUrl");

let APPS_SCRIPT_URL =
  localStorage.getItem(STORAGE_KEY) ||
  "https://script.google.com/macros/s/AKfycbzWRvOrdiAc2pfz7PVh7iOiUq0-o1EFA6yzyXUeX9XHY4nPLkUuOpdrArlD8UNALvQ2LA/exec";

export function getAppsScriptUrl() {
  return APPS_SCRIPT_URL;
}

export function isConnected() {
  return true;
}
const USE_MOCK = () => !APPS_SCRIPT_URL;

async function fetchSheet<T>(sheet: string): Promise<T[]> {
  if (USE_MOCK()) {
    const mockMap: Record<string, unknown[]> = {
      Players: mockPlayers,
      Tournaments: mockTournaments,
      Seasons: mockSeasons,
      Matches: mockMatches,
      BattingScorecard: mockBattingScorecard,
      BowlingScorecard: mockBowlingScorecard,
      Announcements: mockAnnouncements,
      Messages: mockMessages,
    };
    return (mockMap[sheet] || []) as T[];
  }
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=get&sheet=${sheet}`);
    if (!res.ok) return [];
    const data = await res.json();
    return normalizeSheetRows(data as T[]);
  } catch {
    return [];
  }
}

async function writeSheet<T>(sheet: string, action: "add" | "update" | "delete", payload: T): Promise<boolean> {
  if (USE_MOCK()) return true;
  const normalizedPayload = normalizePayload(payload as Record<string, unknown>);
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action, sheet, data: normalizedPayload }),
    });
    if (!res.ok) return false;
    const result = await res.json();
    return !!result.success;
  } catch {
    return false;
  }
}

async function replaceScorecardAtomic(payload: ScorecardReplaceRequest): Promise<ScorecardReplaceResult> {
  if (USE_MOCK()) {
    const checksum = btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).slice(0, 16);
    return {
      success: true,
      operation_id: `OP_MOCK_${Date.now()}`,
      scorecard_version: (payload.expected_scorecard_version || 0) + 1,
      scorecard_checksum: checksum,
    };
  }

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "replaceScorecardAtomic", data: payload }),
    });
    if (!res.ok) {
      return {
        success: false,
        operation_id: "",
        scorecard_version: payload.expected_scorecard_version || 0,
        scorecard_checksum: payload.expected_scorecard_checksum || "",
        error: `HTTP ${res.status}`,
      };
    }
    return res.json() as Promise<ScorecardReplaceResult>;
  } catch (error) {
    return {
      success: false,
      operation_id: "",
      scorecard_version: payload.expected_scorecard_version || 0,
      scorecard_checksum: payload.expected_scorecard_checksum || "",
      error: String(error),
    };
  }
}

function normalizePayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      if (!["date", "start_date", "end_date"].includes(key) || typeof value !== "string") return [key, value];
      const trimmed = value.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return [key, trimmed];
      return [key, value];
    }),
  );
}

export async function seedGoogleSheet(): Promise<{ success: boolean; message: string }> {
  if (USE_MOCK()) return { success: false, message: "Connect Google Sheets first (set Apps Script URL)" };
  try {
    const seedData = {
      Players: mockPlayers,
      Tournaments: mockTournaments,
      Seasons: mockSeasons,
      Matches: mockMatches,
      BattingScorecard: mockBattingScorecard,
      BowlingScorecard: mockBowlingScorecard,
      Announcements: mockAnnouncements,
      Messages: mockMessages,
    };
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "seed", data: seedData }),
    });
    const result = await res.json();
    return { success: result.success, message: result.message || "Done" };
  } catch (err) {
    return { success: false, message: String(err) };
  }
}

export const api = {
  getPlayers: () => fetchSheet<Player>("Players"),
  getTournaments: () => fetchSheet<Tournament>("Tournaments"),
  getSeasons: () => fetchSheet<Season>("Seasons"),
  getMatches: () => fetchSheet<Match>("Matches"),
  getBattingScorecard: () => fetchSheet<BattingScorecard>("BattingScorecard"),
  getBowlingScorecard: () => fetchSheet<BowlingScorecard>("BowlingScorecard"),
  getAnnouncements: () => fetchSheet<Announcement>("Announcements"),
  getMessages: () => fetchSheet<Message>("Messages"),

  addPlayer: (p: Player) => writeSheet("Players", "add", p),
  updatePlayer: (p: Player) => writeSheet("Players", "update", p),
  deletePlayer: (id: string) => writeSheet("Players", "delete", { player_id: id }),

  addTournament: (t: Tournament) => writeSheet("Tournaments", "add", t),
  updateTournament: (t: Tournament) => writeSheet("Tournaments", "update", t),
  deleteTournament: (id: string) => writeSheet("Tournaments", "delete", { tournament_id: id }),

  addSeason: (s: Season) => writeSheet("Seasons", "add", s),
  updateSeason: (s: Season) => writeSheet("Seasons", "update", s),
  deleteSeason: (id: string) => writeSheet("Seasons", "delete", { season_id: id }),

  addMatch: (m: Match) => writeSheet("Matches", "add", m),
  updateMatch: (m: Match) => writeSheet("Matches", "update", m),
  deleteMatch: (id: string) => writeSheet("Matches", "delete", { match_id: id }),

  addBattingEntry: (b: BattingScorecard) => writeSheet("BattingScorecard", "add", b),
  updateBattingEntry: (b: BattingScorecard) => writeSheet("BattingScorecard", "update", b),
  deleteBattingEntry: (id: string) => writeSheet("BattingScorecard", "delete", { id }),

  addBowlingEntry: (b: BowlingScorecard) => writeSheet("BowlingScorecard", "add", b),
  updateBowlingEntry: (b: BowlingScorecard) => writeSheet("BowlingScorecard", "update", b),
  deleteBowlingEntry: (id: string) => writeSheet("BowlingScorecard", "delete", { id }),

  addAnnouncement: (a: Announcement) => writeSheet("Announcements", "add", a),
  updateAnnouncement: (a: Announcement) => writeSheet("Announcements", "update", a),
  deleteAnnouncement: (id: string) => writeSheet("Announcements", "delete", { id }),

  addMessage: (m: Message) => writeSheet("Messages", "add", m),
  updateMessage: (m: Message) => writeSheet("Messages", "update", m),

  replaceScorecardAtomic: (payload: ScorecardReplaceRequest) => replaceScorecardAtomic(payload),
};

export function setAppsScriptUrl(url: string) {
  localStorage.setItem(STORAGE_KEY, url);
  APPS_SCRIPT_URL = url;
}

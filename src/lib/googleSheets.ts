import { Player, Tournament, Season, Match, BattingScorecard, BowlingScorecard, Announcement, Message } from "./types";
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

// Apps Script Web App URL
let APPS_SCRIPT_URL =
  localStorage.getItem("appsScriptUrl") || "https://script.google.com/macros/s/AKfycbxYidUE-Au5j2mmxqeDQDaakNCBEOOfoaaZSll0LU5HAiioYcdzAWn4T2RGJ2M27AVV/exec";

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
  const res = await fetch(`${APPS_SCRIPT_URL}?action=get&sheet=${sheet}`);
  const data = await res.json();
  return data as T[];
}

async function writeSheet<T>(sheet: string, action: "add" | "update" | "delete", payload: T): Promise<boolean> {
  if (USE_MOCK()) return true;
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action, sheet, data: payload }),
  });
  const result = await res.json();
  return result.success;
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
};

export function setAppsScriptUrl(url: string) {
  localStorage.setItem("appsScriptUrl", url);
  APPS_SCRIPT_URL = url;
}

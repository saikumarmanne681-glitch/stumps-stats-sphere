import { format } from "date-fns";

import type { Match, Player, Season, Tournament } from "./types";

const NUMERIC_FIELDS = new Set([
  "overs",
  "year",
  "runs",
  "balls",
  "fours",
  "sixes",
  "strike_rate",
  "maidens",
  "runs_conceded",
  "wickets",
  "economy",
  "extras",
  "rating",
  "authority_level",
  "over",
]);

const BOOLEAN_FIELDS = new Set([
  "active",
  "read",
  "is_verified",
  "support_updates",
  "announcements",
  "security_alerts",
  "is_internal_note",
  "locked",
]);

const GOOGLE_SHEETS_EPOCH_UTC = Date.UTC(1899, 11, 30);

export function normalizeId(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeComparableName(value: unknown) {
  return normalizeId(value).toLowerCase().replace(/\s+/g, " ");
}

/**
 * Resolve a potentially legacy identity field to canonical player_id.
 *
 * MOM rows may store:
 * - canonical `player_id` (current format)
 * - player name (legacy format)
 *
 * This helper first tries an ID match, then exact trimmed name, then normalized
 * name (case-insensitive with whitespace normalization).
 */
export function resolvePlayerIdFromIdentity(
  identity: unknown,
  players: Pick<Player, "player_id" | "name">[],
) {
  const value = normalizeId(identity);
  if (!value) return null;

  const byId = players.find((player) => normalizeId(player.player_id) === value);
  if (byId) return normalizeId(byId.player_id);

  const byExactName = players.find((player) => normalizeId(player.name) === value);
  if (byExactName) return normalizeId(byExactName.player_id);

  const normalizedValue = normalizeComparableName(value);
  const byNormalizedName = players.find(
    (player) => normalizeComparableName(player.name) === normalizedValue,
  );
  return byNormalizedName ? normalizeId(byNormalizedName.player_id) : null;
}

export function resolvePlayerFromIdentity(
  identity: unknown,
  players: Pick<Player, "player_id" | "name">[],
) {
  const resolvedPlayerId = resolvePlayerIdFromIdentity(identity, players);
  if (!resolvedPlayerId) return null;
  return players.find((player) => normalizeId(player.player_id) === resolvedPlayerId) ?? null;
}

function toGoogleSheetsDate(serial: number) {
  const wholeDays = Math.trunc(serial);
  const remainder = serial - wholeDays;
  const timeMs = Math.round(remainder * 24 * 60 * 60 * 1000);
  const parsed = new Date(GOOGLE_SHEETS_EPOCH_UTC + wholeDays * 24 * 60 * 60 * 1000 + timeMs);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseNumericDate(value: number) {
  if (!Number.isFinite(value)) return null;
  if (value > 10 ** 11) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (value >= 20000 && value <= 80000) return toGoogleSheetsDate(value);
  return null;
}

function parseSlashDate(value: string) {
  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return null;

  const [, first, second, third] = match;
  const left = Number(first);
  const middle = Number(second);
  const year = Number(third.length === 2 ? `20${third}` : third);

  if (!left || !middle || !year) return null;

  const day = left > 12 ? left : middle > 12 ? middle : left;
  const month = left > 12 ? middle : left;
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseIsoDateOnly(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseSheetDate(value: unknown) {
  if (value == null || value === "") return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    return parseNumericDate(value);
  }

  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const numeric = Number(trimmed);
    const parsedNumeric = parseNumericDate(numeric);
    if (parsedNumeric) return parsedNumeric;
  }

  const slashDate = parseSlashDate(trimmed);
  if (slashDate) return slashDate;

  const isoDateOnly = parseIsoDateOnly(trimmed);
  if (isoDateOnly) return isoDateOnly;

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function coerceFieldValue(key: string, value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed === "") return trimmed;

    if (NUMERIC_FIELDS.has(key)) {
      const numeric = Number(trimmed);
      if (!Number.isNaN(numeric)) return numeric;
    }

    if (BOOLEAN_FIELDS.has(key)) {
      if (trimmed.toLowerCase() === "true") return true;
      if (trimmed.toLowerCase() === "false") return false;
    }

    if (["start_date", "end_date", "date"].includes(key)) {
      const parsed = parseSheetDate(trimmed);
      return parsed ? formatDateOnly(parsed) : trimmed;
    }

    return trimmed;
  }

  if (typeof value === "number" && ["start_date", "end_date", "date"].includes(key)) {
    const parsed = parseSheetDate(value);
    return parsed ? formatDateOnly(parsed) : value;
  }

  return value;
}

export function normalizeSheetRows<T>(rows: T[]): T[] {
  return rows.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return row;
    }

    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, coerceFieldValue(key, value)]),
    ) as T;
  });
}

export function formatSheetDate(value: unknown, pattern: string, fallback = "-") {
  const parsed = parseSheetDate(value);
  return parsed ? format(parsed, pattern) : fallback;
}

export function hasSheetDate(value: unknown) {
  return parseSheetDate(value) !== null;
}

export function compareSheetDatesDesc(left: unknown, right: unknown) {
  const leftTime = parseSheetDate(left)?.getTime() ?? Number.NEGATIVE_INFINITY;
  const rightTime = parseSheetDate(right)?.getTime() ?? Number.NEGATIVE_INFINITY;
  return rightTime - leftTime;
}

export function findTournamentById(
  tournamentId: string | undefined,
  tournaments: Tournament[],
  seasons: Season[],
  matches: Match[],
) {
  const normalizedTournamentId = normalizeId(tournamentId);

  const directTournament = tournaments.find(
    (tournament) => normalizeId(tournament.tournament_id) === normalizedTournamentId,
  );
  if (directTournament) {
    return directTournament;
  }

  const relatedSeason = seasons.find((season) => normalizeId(season.tournament_id) === normalizedTournamentId);
  const relatedMatch = matches.find((match) => normalizeId(match.tournament_id) === normalizedTournamentId);

  if (!relatedSeason && !relatedMatch) {
    return null;
  }

  return {
    tournament_id: normalizedTournamentId,
    name: directTournament?.name || `Tournament ${normalizedTournamentId}`,
    format: directTournament?.format || "League",
    overs: directTournament?.overs || 0,
    description:
      directTournament?.description ||
      "Tournament metadata is still syncing from the linked Google Sheet. Related seasons and matches are shown below.",
  } satisfies Tournament;
}

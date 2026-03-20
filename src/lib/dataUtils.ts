import type { Match, Season, Tournament } from "./types";

export function normalizeId(value: unknown) {
  return String(value ?? "").trim();
}

export function normalizeSheetRows<T>(rows: T[]): T[] {
  return rows.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return row;
    }

    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => {
        if (typeof value === "string") {
          return [key, value.trim()];
        }

        return [key, value];
      }),
    ) as T;
  });
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

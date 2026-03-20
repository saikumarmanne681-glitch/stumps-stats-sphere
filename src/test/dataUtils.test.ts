import { describe, expect, it } from "vitest";

import { findTournamentById, normalizeId, normalizeSheetRows } from "@/lib/dataUtils";

describe("dataUtils", () => {
  it("trims ids from route params and sheet rows", () => {
    expect(normalizeId(" T001 ")).toBe("T001");
    expect(normalizeSheetRows([{ tournament_id: " T001 ", name: " Premier League " }])).toEqual([
      { tournament_id: "T001", name: "Premier League" },
    ]);
  });

  it("builds a fallback tournament from related seasons or matches", () => {
    const tournament = findTournamentById(
      " T404 ",
      [],
      [
        {
          season_id: "S001",
          tournament_id: "T404",
          year: 2026,
          start_date: "2026-01-01",
          end_date: "2026-03-01",
          status: "ongoing",
        },
      ],
      [],
    );

    expect(tournament).toMatchObject({
      tournament_id: "T404",
      name: "Tournament T404",
      format: "League",
    });
  });
});

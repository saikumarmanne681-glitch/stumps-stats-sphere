import { describe, expect, it } from "vitest";

import {
  compareSheetDatesDesc,
  findTournamentById,
  formatSheetDate,
  normalizeId,
  normalizeSheetRows,
  parseSheetDate,
  resolvePlayerFromIdentity,
  resolvePlayerIdFromIdentity,
} from "@/lib/dataUtils";

describe("dataUtils", () => {
  it("trims ids from route params and sheet rows", () => {
    expect(normalizeId(" T001 ")).toBe("T001");
    expect(normalizeSheetRows([{ tournament_id: " T001 ", name: " Premier League " }])).toEqual([
      { tournament_id: "T001", name: "Premier League" },
    ]);
  });

  it("normalizes sheet numeric and google-serial date fields", () => {
    expect(
      normalizeSheetRows([
        {
          tournament_id: " LPL864763 ",
          overs: "20",
          year: "2025",
          start_date: 45717,
          date: "45718",
          active: "TRUE",
        },
      ]),
    ).toEqual([
      {
        tournament_id: "LPL864763",
        overs: 20,
        year: 2025,
        start_date: "2025-03-01",
        date: "2025-03-02",
        active: true,
      },
    ]);
  });

  it("parses and safely formats multiple sheet date shapes", () => {
    expect(parseSheetDate("2025-03-01")?.toISOString()).toContain("2025-03-01");
    expect(parseSheetDate("01/03/2025")?.toISOString()).toContain("2025-03-01");
    expect(parseSheetDate("45717")?.toISOString()).toContain("2025-03-01");
    expect(formatSheetDate("not-a-date", "dd MMM yyyy")).toBe("-");
  });

  it("sorts invalid dates after valid dates", () => {
    const rows = [{ date: "" }, { date: "2025-03-01" }, { date: "45718" }];
    rows.sort((a, b) => compareSheetDatesDesc(a.date, b.date));
    expect(rows.map((row) => row.date)).toEqual(["45718", "2025-03-01", ""]);
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

  it("resolves player identity from canonical id and legacy name values", () => {
    const players = [
      { player_id: "P001", name: "Jane Batter" },
      { player_id: "P002", name: "Ravi Kumar" },
    ];

    expect(resolvePlayerIdFromIdentity("P001", players)).toBe("P001");
    expect(resolvePlayerIdFromIdentity("Jane Batter", players)).toBe("P001");
    expect(resolvePlayerIdFromIdentity("  ravi   kumar ", players)).toBe("P002");
    expect(resolvePlayerIdFromIdentity("Unknown Player", players)).toBeNull();
  });

  it("resolves full player rows for mixed MOM identity formats", () => {
    const players = [
      { player_id: "P001", name: "Jane Batter" },
      { player_id: "P002", name: "Ravi Kumar" },
    ];

    expect(resolvePlayerFromIdentity("P002", players)?.name).toBe("Ravi Kumar");
    expect(resolvePlayerFromIdentity("jane batter", players)?.player_id).toBe("P001");
    expect(resolvePlayerFromIdentity("", players)).toBeNull();
  });
});

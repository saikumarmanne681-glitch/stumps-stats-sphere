import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MatchDetailDialog } from "@/components/MatchDetailDialog";
import type { Match, Player } from "@/lib/types";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/v2api", () => ({
  v2api: { addTicket: vi.fn(), syncHeaders: vi.fn() },
  istNow: () => new Date().toISOString(),
  logAudit: vi.fn(),
}));

const players: Player[] = [
  {
    player_id: "P001",
    name: "Jane Batter",
    username: "jane",
    password: "secret",
    phone: "1234567890",
    role: "batsman",
    status: "active",
  },
];

const match: Match = {
  match_id: "M001",
  season_id: "S001",
  tournament_id: "T001",
  date: "2026-03-20",
  team_a: "Strikers",
  team_b: "Chargers",
  venue: "Main Ground",
  status: "completed",
  toss_winner: "Strikers",
  toss_decision: "bat",
  result: "Strikers won by 10 runs",
  man_of_match: "P001",
  team_a_score: "150/6 (20)",
  team_b_score: "140/8 (20)",
  match_stage: "League",
};

describe("MatchDetailDialog", () => {
  it("can transition from no selected match to an opened match without crashing", () => {
    const { rerender } = render(
      <MatchDetailDialog
        match={null}
        open={false}
        onOpenChange={() => {}}
        batting={[]}
        bowling={[]}
        players={players}
      />,
    );

    rerender(
      <MatchDetailDialog
        match={match}
        open
        onOpenChange={() => {}}
        batting={[]}
        bowling={[]}
        players={players}
      />,
    );

    expect(screen.getByText("Strikers vs Chargers")).toBeInTheDocument();
    expect(screen.getByText("Strikers won by 10 runs")).toBeInTheDocument();
  });
});

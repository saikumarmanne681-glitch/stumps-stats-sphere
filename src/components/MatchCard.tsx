import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Match, Tournament, Player, BattingScorecard, Season } from "@/lib/types";
import { Calendar, ChevronRight, MapPin, Award } from "lucide-react";
import { formatSheetDate } from "@/lib/dataUtils";
import { getTeamScoreSummary } from "@/lib/liveScoring";

interface MatchCardProps {
  match: Match;
  tournament?: Tournament;
  season?: Season;
  players: Player[];
  batting?: BattingScorecard[];
  onClick?: () => void;
}

export function MatchCard({ match, tournament, season, players = [], batting = [], onClick }: MatchCardProps) {
  const isInteractive = typeof onClick === "function";
  const safePlayers = players ?? [];
  const safeBatting = batting ?? [];
  const mom = safePlayers.find((p) => p.player_id === match.man_of_match);
  const statusColors: Record<string, string> = {
    completed: "bg-primary text-primary-foreground",
    live: "bg-destructive text-destructive-foreground",
    scheduled: "bg-accent text-accent-foreground",
    cancelled: "bg-muted text-muted-foreground",
  };

  const matchBatting = safeBatting.filter((b) => b.match_id === match.match_id);
  const teamAScore = getTeamScoreSummary(matchBatting, match.team_a, match.team_a_score);
  const teamBScore = getTeamScoreSummary(matchBatting, match.team_b, match.team_b_score);
  const matchDateLabel = formatSheetDate(match.date, "dd MMM yyyy", "Date TBD");

  return (
    <Card
      className={`h-full border border-white/80 bg-white/84 shadow-[0_16px_38px_-30px_rgba(15,23,42,0.16)] transition-all duration-200 ${isInteractive ? "cursor-pointer active:scale-[0.99] hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/[0.03] focus-within:border-primary/60" : ""}`}
      onClick={onClick}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      } : undefined}
      aria-label={isInteractive ? `Open match details for ${match.team_a} vs ${match.team_b}` : undefined}
    >
      <CardContent className="flex h-full flex-col gap-3.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="block text-[11px] font-mono text-muted-foreground">{match.match_id}</span>
            {isInteractive && <span className="text-[11px] font-medium text-primary">Open scorecard</span>}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {match.match_stage && (
              <Badge variant="secondary" className="text-[10px] font-medium">
                {match.match_stage}
              </Badge>
            )}
            <Badge className={statusColors[match.status] || "bg-muted"}>
              {match.status === "live" && "🔴 "}
              {match.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        {tournament && (
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {tournament.name} • {tournament.format}
            {season ? ` • ${season.year}` : ""}
          </p>
        )}

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
          <div className="text-center">
            <span className="block font-display text-[15px] font-semibold sm:text-base">{match.team_a}</span>
            {(teamAScore.display || match.status === "live") && (
              <span className="text-sm font-semibold text-primary">{teamAScore.display || "0/0 (0.0)"}</span>
            )}
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">vs</span>
          <div className="text-center">
            <span className="block font-display text-[15px] font-semibold sm:text-base">{match.team_b}</span>
            {(teamBScore.display || match.status === "live") && (
              <span className="text-sm font-semibold text-primary">{teamBScore.display || "0/0 (0.0)"}</span>
            )}
          </div>
        </div>

        {match.result && <p className="text-sm font-medium text-primary text-center">{match.result}</p>}

        <div className="mt-auto flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {matchDateLabel}
          </span>
          {match.venue && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {match.venue}
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          {mom ? (
            <div className="flex items-center gap-1 text-[11px] text-accent">
              <Award className="h-3 w-3" />
              <span className="font-medium">MOM: {mom.name}</span>
            </div>
          ) : <span />}
          {isInteractive && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
              Details <ChevronRight className="h-3 w-3" />
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

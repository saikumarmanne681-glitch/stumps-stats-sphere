import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Match, Tournament, Player, BattingScorecard, Season } from "@/lib/types";
import { Calendar, MapPin, Award } from "lucide-react";
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
      className="h-full border border-border bg-card shadow-none transition-colors duration-200 hover:border-primary/50 hover:bg-primary/[0.03] cursor-pointer active:scale-[0.98]"
      onClick={onClick}
    >
      <CardContent className="flex h-full flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground font-mono">{match.match_id}</span>
          <div className="flex items-center gap-1">
            {match.match_stage && (
              <Badge variant="secondary" className="text-[10px] font-display">
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
          <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wide">
            {tournament.name} • {tournament.format}
            {season ? ` • ${season.year}` : ""}
          </p>
        )}

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="text-center flex-1">
            <span className="block font-display text-base font-semibold sm:text-lg">{match.team_a}</span>
            {(teamAScore.display || match.status === "live") && (
              <span className="text-sm font-bold text-primary">{teamAScore.display || "0/0 (0.0)"}</span>
            )}
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">vs</span>
          <div className="text-center flex-1">
            <span className="block font-display text-base font-semibold sm:text-lg">{match.team_b}</span>
            {(teamBScore.display || match.status === "live") && (
              <span className="text-sm font-bold text-primary">{teamBScore.display || "0/0 (0.0)"}</span>
            )}
          </div>
        </div>

        {match.result && <p className="text-sm text-primary font-medium mb-2 text-center">{match.result}</p>}

        <div className="mt-auto flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
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

        {mom && (
          <div className="flex items-center gap-1 mt-2 text-xs text-accent">
            <Award className="h-3 w-3" />
            <span className="font-medium">MOM: {mom.name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

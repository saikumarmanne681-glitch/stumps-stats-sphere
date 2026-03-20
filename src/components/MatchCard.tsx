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

export function MatchCard({ match, tournament, season, players, batting = [], onClick }: MatchCardProps) {
  const mom = players.find((p) => p.player_id === match.man_of_match);
  const statusColors: Record<string, string> = {
    completed: "bg-primary text-primary-foreground",
    live: "bg-destructive text-destructive-foreground",
    scheduled: "bg-accent text-accent-foreground",
    cancelled: "bg-muted text-muted-foreground",
  };

  const matchBatting = batting.filter((b) => b.match_id === match.match_id);
  const teamAScore = getTeamScoreSummary(matchBatting, match.team_a, match.team_a_score);
  const teamBScore = getTeamScoreSummary(matchBatting, match.team_b, match.team_b_score);
  const matchDateLabel = formatSheetDate(match.date, "dd MMM yyyy", "Date TBD");

  return (
    <Card
      className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary cursor-pointer hover:border-l-accent active:scale-[0.98]"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground font-mono">{match.match_id}</span>
          <div className="flex items-center gap-1">
            {match.match_stage && (
              <Badge className="bg-blue-100 text-blue-800 border border-blue-300 text-[10px] font-display">
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

        <div className="flex items-center justify-between my-3">
          <div className="text-center flex-1">
            <span className="font-display text-lg font-semibold block">{match.team_a}</span>
            {(teamAScore.display || match.status === "live") && (
              <span className="text-primary font-bold text-sm">{teamAScore.display || "0/0 (0.0)"}</span>
            )}
          </div>
          <span className="text-muted-foreground text-sm font-bold px-2">vs</span>
          <div className="text-center flex-1">
            <span className="font-display text-lg font-semibold block">{match.team_b}</span>
            {(teamBScore.display || match.status === "live") && (
              <span className="text-primary font-bold text-sm">{teamBScore.display || "0/0 (0.0)"}</span>
            )}
          </div>
        </div>

        {match.result && <p className="text-sm text-primary font-medium mb-2 text-center">{match.result}</p>}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
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

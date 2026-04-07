import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Match, Tournament, Player, BattingScorecard, Season } from "@/lib/types";
import { Calendar, MapPin, Award, Crown, Sparkles, Trophy } from "lucide-react";
import { formatSheetDate, resolvePlayerFromIdentity } from "@/lib/dataUtils";
import { getTeamScoreSummary } from "@/lib/liveScoring";
import { getMatchStageChipClass, getStableChipClass } from "@/lib/chipColors";

interface MatchCardProps {
  match: Match;
  tournament?: Tournament;
  season?: Season;
  players: Player[];
  batting?: BattingScorecard[];
  onClick?: () => void;
}

export function MatchCard({ match, tournament, season, players, batting = [], onClick }: MatchCardProps) {
  const mom = resolvePlayerFromIdentity(match.man_of_match, players);
  const teamACaptain = resolvePlayerFromIdentity(match.team_a_captain, players);
  const teamBCaptain = resolvePlayerFromIdentity(match.team_b_captain, players);
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
  const normalizedStage = String(match.match_stage || "").trim().toLowerCase();
  const isPremiumKnockout = /(final|semi|qualifier|eliminator|play[- ]?off|quarter final)/i.test(normalizedStage);
  const marqueeTitle = normalizedStage.includes("final")
    ? "Grand Finale"
    : normalizedStage.includes("semi")
      ? "Semi Final Showdown"
      : normalizedStage.includes("qualifier")
        ? "Qualifier Clash"
        : normalizedStage.includes("eliminator")
          ? "Eliminator Battle"
          : normalizedStage.includes("quarter")
            ? "Quarter Final Face-off"
            : normalizedStage.includes("play")
              ? "Play-off Spotlight"
              : "Featured Match";

  return (
    <Card
      className={`group relative overflow-hidden transition-all duration-300 cursor-pointer active:scale-[0.98] ${
        isPremiumKnockout
          ? "border border-amber-300/70 bg-gradient-to-br from-amber-100/80 via-orange-50 to-rose-100/70 shadow-[0_8px_30px_-20px_rgba(194,65,12,0.6)] hover:shadow-[0_18px_40px_-24px_rgba(194,65,12,0.7)]"
          : "border-l-4 border-l-primary hover:border-l-accent hover:shadow-lg"
      }`}
      onClick={onClick}
    >
      {isPremiumKnockout && (
        <>
          <div className="pointer-events-none absolute inset-0 opacity-80">
            <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br from-amber-300/35 to-transparent blur-sm" />
            <div className="absolute -left-12 bottom-2 h-36 w-36 rounded-full bg-gradient-to-tr from-rose-300/30 to-transparent blur-sm" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.45)_0%,transparent_35%),radial-gradient(circle_at_10%_85%,rgba(255,255,255,0.35)_0%,transparent_40%)]" />
          </div>
          <div className="pointer-events-none absolute right-3 top-3 hidden rounded-full border border-amber-400/40 bg-white/65 px-2 py-1 text-[10px] font-semibold tracking-wide text-amber-800 backdrop-blur sm:flex sm:items-center sm:gap-1">
            <Sparkles className="h-3 w-3" /> Premium Fixture
          </div>
        </>
      )}
      <CardContent className="p-3 sm:p-4">
        {isPremiumKnockout && (
          <div className="relative z-10 mb-3 rounded-xl border border-amber-300/70 bg-white/75 px-3 py-2 backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display text-xs uppercase tracking-[0.2em] text-amber-900/80">{marqueeTitle}</p>
              <Trophy className="h-3.5 w-3.5 text-amber-700" />
            </div>
            <p className="mt-1 text-[11px] text-amber-900/75">Special presentation card for high-stakes matches.</p>
          </div>
        )}
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className={`text-[11px] font-mono break-all ${isPremiumKnockout ? "text-amber-950/70" : "text-muted-foreground"}`}>{match.match_id}</span>
          <div className="flex flex-wrap items-center gap-1">
            {match.match_stage && (
              <Badge className={`border text-[10px] font-display ${getMatchStageChipClass(match.match_stage)}`}>
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
          <div className="mb-2 flex flex-wrap gap-1">
            <Badge className={`border text-[10px] ${getStableChipClass(tournament.name)}`}>{tournament.name}</Badge>
            <Badge className={`border text-[10px] ${getStableChipClass(`${tournament.name}-${season?.year || tournament.format}`)}`}>
              {season ? `Season ${season.year}` : tournament.format}
            </Badge>
          </div>
        )}

        <div className="my-3 flex items-center justify-between gap-2">
          <div className="text-center flex-1">
            <span className={`font-display text-base sm:text-lg font-semibold block leading-tight ${isPremiumKnockout ? "text-amber-950" : ""}`}>{match.team_a}</span>
            {(teamAScore.display || match.status === "live") && (
              <span className="text-primary font-bold text-sm">{teamAScore.display || "0/0 (0.0)"}</span>
            )}
          </div>
          <span className="text-muted-foreground text-xs sm:text-sm font-bold px-1 sm:px-2">vs</span>
          <div className="text-center flex-1">
            <span className={`font-display text-base sm:text-lg font-semibold block leading-tight ${isPremiumKnockout ? "text-amber-950" : ""}`}>{match.team_b}</span>
            {(teamBScore.display || match.status === "live") && (
              <span className="text-primary font-bold text-sm">{teamBScore.display || "0/0 (0.0)"}</span>
            )}
          </div>
        </div>

        {match.result && <p className="text-sm text-primary font-medium mb-2 text-center">{match.result}</p>}

        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
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
        {(teamACaptain || teamBCaptain) && (
          <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
            {teamACaptain && <Badge variant="outline" className="rounded-full"><Crown className="mr-1 h-3 w-3 text-amber-500" />{match.team_a}: {teamACaptain.name}</Badge>}
            {teamBCaptain && <Badge variant="outline" className="rounded-full"><Crown className="mr-1 h-3 w-3 text-amber-500" />{match.team_b}: {teamBCaptain.name}</Badge>}
          </div>
        )}

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

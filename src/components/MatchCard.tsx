import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Match, Tournament, Player, BattingScorecard, Season } from "@/lib/types";
import { Calendar, MapPin, Award, Sparkles, Trophy } from "lucide-react";
import { formatSheetDate } from "@/lib/dataUtils";
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
          ? "border border-amber-200/40 bg-[#262626] text-slate-100 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.85)] hover:shadow-[0_24px_45px_-20px_rgba(0,0,0,0.9)]"
          : "border-l-4 border-l-primary hover:border-l-accent hover:shadow-lg"
      }`}
      onClick={onClick}
    >
      {isPremiumKnockout && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#262626] via-[#2f2832] to-[#1f1f1f]" />
          <div className="pointer-events-none absolute inset-0 opacity-15 [background-image:radial-gradient(circle_at_20px_20px,rgba(255,255,255,0.85)_2px,transparent_2.5px),radial-gradient(circle_at_60px_60px,rgba(255,255,255,0.75)_2px,transparent_2.5px),conic-gradient(from_0deg_at_50%_50%,transparent_0_60deg,rgba(255,255,255,0.45)_60deg_80deg,transparent_80deg_140deg,rgba(255,255,255,0.45)_140deg_160deg,transparent_160deg_220deg,rgba(255,255,255,0.45)_220deg_240deg,transparent_240deg_300deg,rgba(255,255,255,0.45)_300deg_320deg,transparent_320deg_360deg)] [background-size:80px_80px,80px_80px,220px_220px] [background-position:0_0,40px_40px,center]" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-52 w-52 rounded-full opacity-80 [background:radial-gradient(circle,rgba(255,229,130,0.55)_0%,rgba(255,188,80,0.2)_35%,rgba(255,188,80,0.04)_55%,transparent_75%),conic-gradient(from_0deg,rgba(255,212,112,0.55),rgba(255,244,190,0.05),rgba(255,194,64,0.55),rgba(255,242,191,0.05),rgba(255,212,112,0.55))] blur-[0.5px]" />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#171717]/80 to-transparent" />
          <div className="pointer-events-none absolute right-3 top-3 hidden rounded-full border border-amber-200/35 bg-[#2d2d2d]/55 px-2 py-1 text-[10px] font-semibold tracking-wide text-amber-100 backdrop-blur-md sm:flex sm:items-center sm:gap-1">
            <Sparkles className="h-3 w-3 text-amber-300" /> Heritage Spotlight
          </div>
        </>
      )}
      <CardContent className={`relative p-4 ${isPremiumKnockout ? "backdrop-blur-[1px]" : ""}`}>
        {isPremiumKnockout && (
          <div className="relative z-10 mb-3 rounded-xl border border-slate-200/15 bg-[#373737]/45 px-3 py-2 backdrop-blur-md">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display text-xs uppercase tracking-[0.2em] text-amber-100/90">{marqueeTitle}</p>
              <Trophy className="h-3.5 w-3.5 text-amber-300" />
            </div>
            <p className="mt-1 text-[11px] text-slate-200/85">Mandala + Kolam treatment for title-stage fixtures.</p>
          </div>
        )}
        <div className={`mb-2 flex items-center justify-between ${isPremiumKnockout ? "rounded-lg border border-slate-200/10 bg-[#373737]/40 px-2 py-1.5 backdrop-blur-md" : ""}`}>
          <span className={`text-xs font-mono ${isPremiumKnockout ? "text-slate-200/80" : "text-muted-foreground"}`}>{match.match_id}</span>
          <div className="flex items-center gap-1">
            {match.match_stage && (
              <Badge className={`border text-[10px] font-display ${getMatchStageChipClass(match.match_stage)}`}>
                {match.match_stage}
              </Badge>
            )}
            <Badge className={`${statusColors[match.status] || "bg-muted"} ${isPremiumKnockout ? "border border-slate-100/30 bg-[#2f2f2f] text-slate-100" : ""}`}>
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

        <div className={`my-3 flex items-center justify-between ${isPremiumKnockout ? "rounded-xl border border-slate-100/10 bg-[#403940]/45 px-3 py-2 backdrop-blur-md" : ""}`}>
          <div className="text-center flex-1">
            <span className={`font-display text-lg font-semibold block ${isPremiumKnockout ? "text-[#F2F2F2]" : ""}`}>{match.team_a}</span>
            {(teamAScore.display || match.status === "live") && (
              <span className={`font-bold text-sm ${isPremiumKnockout ? "text-[#6dc1ff]" : "text-primary"}`}>{teamAScore.display || "0/0 (0.0)"}</span>
            )}
          </div>
          <span className={`text-sm font-bold px-2 ${isPremiumKnockout ? "text-amber-200/90" : "text-muted-foreground"}`}>vs</span>
          <div className="text-center flex-1">
            <span className={`font-display text-lg font-semibold block ${isPremiumKnockout ? "text-[#F2F2F2]" : ""}`}>{match.team_b}</span>
            {(teamBScore.display || match.status === "live") && (
              <span className={`font-bold text-sm ${isPremiumKnockout ? "text-[#6dc1ff]" : "text-primary"}`}>{teamBScore.display || "0/0 (0.0)"}</span>
            )}
          </div>
        </div>

        {match.result && (
          <p className={`mb-2 text-center text-sm font-medium ${isPremiumKnockout ? "rounded-lg border border-emerald-300/20 bg-emerald-500/10 px-2 py-1 text-emerald-200" : "text-primary"}`}>
            {match.result}
          </p>
        )}

        <div className={`flex items-center gap-4 text-xs ${isPremiumKnockout ? "text-slate-300/85" : "text-muted-foreground"}`}>
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
          <div className={`mt-2 flex items-center gap-1 text-xs ${isPremiumKnockout ? "text-amber-200" : "text-accent"}`}>
            <Award className="h-3 w-3" />
            <span className="font-medium">MOM: {mom.name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

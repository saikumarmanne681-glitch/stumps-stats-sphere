import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnnouncementTicker } from "@/components/AnnouncementTicker";
import { Leaderboard } from "@/components/Leaderboard";
import { MatchCard } from "@/components/MatchCard";
import { MatchDetailDialog } from "@/components/MatchDetailDialog";
import { Navbar } from "@/components/Navbar";
import { useData } from "@/lib/DataContext";
import { getLatestMatches } from "@/lib/calculations";
import { formatSheetDate, hasSheetDate } from "@/lib/dataUtils";
import { Match } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Radio, Search, Shield, Trophy, Users } from "lucide-react";

const Home = () => {
  const { players = [], tournaments = [], seasons = [], matches = [], batting = [], bowling = [], announcements = [], loading } = useData();
  const [filterTournament, setFilterTournament] = useState<string>("all");
  const [filterSeason, setFilterSeason] = useState<string>("all");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [matchSearch, setMatchSearch] = useState("");

  const latestMatches = useMemo(() => getLatestMatches(matches, 8), [matches]);

  const relevantSeasons = useMemo(() => {
    if (filterTournament === "all") return seasons;
    return seasons.filter((season) => season.tournament_id === filterTournament);
  }, [filterTournament, seasons]);

  const filteredMatchIds = useMemo(() => {
    let filtered = matches;
    if (filterTournament !== "all") filtered = filtered.filter((match) => match.tournament_id === filterTournament);
    if (filterSeason !== "all") filtered = filtered.filter((match) => match.season_id === filterSeason);
    return filtered.map((match) => match.match_id);
  }, [filterTournament, filterSeason, matches]);

  const displayMatches = useMemo(() => {
    const sourceMatches = showAllMatches ? getLatestMatches(matches, matches.length) : latestMatches;
    let result = sourceMatches;

    if (filterTournament !== "all") result = result.filter((match) => match.tournament_id === filterTournament);
    if (filterSeason !== "all") result = result.filter((match) => match.season_id === filterSeason);

    const query = matchSearch.trim().toLowerCase();
    if (!query) return result;

    return result.filter((match) => {
      const tournamentName = tournaments.find((tournament) => tournament.tournament_id === match.tournament_id)?.name?.toLowerCase() || "";
      return [match.match_id, match.team_a, match.team_b, match.venue, match.result, tournamentName].some((value) =>
        value?.toLowerCase().includes(query),
      );
    });
  }, [filterTournament, filterSeason, latestMatches, matchSearch, matches, showAllMatches, tournaments]);

  const featuredSeasons = useMemo(() => {
    const scopedSeasons = filterTournament === "all"
      ? seasons
      : seasons.filter((season) => season.tournament_id === filterTournament);

    return scopedSeasons
      .sort((a, b) => b.year - a.year)
      .slice(0, 3)
      .map((season) => {
        const seasonMatches = matches.filter((match) => match.season_id === season.season_id);
        const tournament = tournaments.find((item) => item.tournament_id === season.tournament_id);
        const liveCount = seasonMatches.filter((match) => match.status === "live").length;
        const completedCount = seasonMatches.filter((match) => match.status === "completed").length;
        const teams = new Set(seasonMatches.flatMap((match) => [match.team_a, match.team_b]));

        return {
          season,
          tournament,
          matchCount: seasonMatches.length,
          liveCount,
          completedCount,
          teams: teams.size,
        };
      });
  }, [filterTournament, matches, seasons, tournaments]);

  const heroStats = [
    { label: "Players", value: players.length, icon: Users },
    { label: "Tournaments", value: tournaments.length, icon: Trophy },
    { label: "Live Matches", value: matches.filter((match) => match.status === "live").length, icon: Radio },
    { label: "Announcements", value: announcements.length, icon: Shield },
  ];

  const handleMatchClick = (match: Match) => {
    setSelectedMatch(match);
    setDetailOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <AnnouncementTicker />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <section className="portal-hero">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-6">
              <Badge className="portal-pill">Official cricket stats portal</Badge>
              <div className="space-y-4">
                <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                  Clean, responsive match coverage for mobile and desktop.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                  A simpler one-to-two color sports portal layout focused on scores, schedules, rankings, and season tracking without the visual overload.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {heroStats.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="portal-stat-card">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</span>
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <p className="mt-4 font-display text-3xl font-bold text-foreground">{value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="sm:min-w-[180px]" asChild>
                  <Link to="/leaderboards">View leaderboards</Link>
                </Button>
                <Button size="lg" variant="outline" className="sm:min-w-[180px]" asChild>
                  <Link to="/live">Open live center</Link>
                </Button>
              </div>
            </div>

            <Card className="portal-panel border-border/70 bg-card/95 shadow-none">
              <CardContent className="space-y-5 p-5 sm:p-6">
                <div>
                  <p className="portal-label">Today’s snapshot</p>
                  <h2 className="font-display text-2xl font-semibold">Competition overview</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="portal-mini-card">
                    <p className="portal-label">Latest results</p>
                    <p className="text-2xl font-semibold text-foreground">{latestMatches.length}</p>
                    <p className="text-sm text-muted-foreground">Recent fixtures available in the match feed.</p>
                  </div>
                  <div className="portal-mini-card">
                    <p className="portal-label">Active seasons</p>
                    <p className="text-2xl font-semibold text-foreground">{seasons.filter((season) => season.status === "ongoing").length}</p>
                    <p className="text-sm text-muted-foreground">Ongoing campaigns currently tracked in the portal.</p>
                  </div>
                </div>
                <div className="portal-mini-card">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="portal-label">Announcements</p>
                      <p className="text-sm text-muted-foreground">Stay aligned with the latest verified notices.</p>
                    </div>
                    <Badge variant="secondary">{announcements.length} updates</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {loading && (
          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            Loading verified score and season data...
          </div>
        )}

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="portal-panel shadow-none">
            <CardContent className="p-5 sm:p-6">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="portal-label">Match filters</p>
                  <h2 className="font-display text-2xl font-semibold">Browse fixtures faster</h2>
                </div>
                <Badge variant="outline">Responsive control bar</Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
                <Select value={filterTournament} onValueChange={(value) => { setFilterTournament(value); setFilterSeason("all"); }}>
                  <SelectTrigger className="portal-input h-12 w-full">
                    <SelectValue placeholder="Tournament" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tournaments</SelectItem>
                    {tournaments.map((tournament) => (
                      <SelectItem key={tournament.tournament_id} value={tournament.tournament_id}>
                        {tournament.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterSeason} onValueChange={setFilterSeason}>
                  <SelectTrigger className="portal-input h-12 w-full">
                    <SelectValue placeholder="Season" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All seasons</SelectItem>
                    {relevantSeasons.map((season) => (
                      <SelectItem key={season.season_id} value={season.season_id}>
                        {season.year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" className="h-12 w-full xl:w-auto" onClick={() => { setFilterTournament("all"); setFilterSeason("all"); setMatchSearch(""); }}>
                  Reset filters
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="portal-panel shadow-none">
            <CardContent className="p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="portal-label">Season spotlight</p>
                  <h2 className="font-display text-2xl font-semibold">Current campaigns</h2>
                </div>
                <Badge variant="secondary">{featuredSeasons.length} featured</Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {featuredSeasons.length === 0 ? (
                  <div className="portal-mini-card md:col-span-3">No seasons found for the selected tournament.</div>
                ) : (
                  featuredSeasons.map(({ season, tournament, matchCount, completedCount, liveCount, teams }) => (
                    <div key={season.season_id} className="portal-mini-card flex h-full flex-col gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{tournament?.name || "Season"}</p>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{tournament?.format || "League"}</p>
                        </div>
                        <Badge variant={season.status === "ongoing" ? "default" : "outline"} className="capitalize">
                          {season.status}
                        </Badge>
                      </div>
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-3xl font-bold text-foreground">{season.year}</p>
                          {hasSheetDate(season.start_date) && hasSheetDate(season.end_date) && (
                            <p className="text-xs text-muted-foreground">
                              {formatSheetDate(season.start_date, "dd MMM")} - {formatSheetDate(season.end_date, "dd MMM yyyy")}
                            </p>
                          )}
                        </div>
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-semibold text-foreground">{matchCount}</p>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Matches</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-foreground">{completedCount}</p>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Done</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-foreground">{teams}</p>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Teams</p>
                        </div>
                      </div>
                      {liveCount > 0 && <Badge className="w-fit">{liveCount} live now</Badge>}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="portal-label">Latest matches</p>
                <h2 className="font-display text-2xl font-semibold">Scoreboard-style match feed</h2>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={matchSearch}
                    onChange={(event) => setMatchSearch(event.target.value)}
                    placeholder="Search teams, venue, result"
                    className="portal-input h-12 min-w-0 pl-9 sm:w-72"
                  />
                </div>
                <Button variant="outline" className="h-12" onClick={() => setShowAllMatches((current) => !current)}>
                  {showAllMatches ? "Show latest" : "Show more"}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {displayMatches.length === 0 ? (
                <Card className="portal-panel md:col-span-2 shadow-none">
                  <CardContent className="p-6 text-sm text-muted-foreground">No matches found for the current filters or search.</CardContent>
                </Card>
              ) : (
                displayMatches.map((match) => (
                  <MatchCard
                    key={match.match_id}
                    match={match}
                    tournament={tournaments.find((tournament) => tournament.tournament_id === match.tournament_id)}
                    season={seasons.find((season) => season.season_id === match.season_id)}
                    players={players}
                    batting={batting}
                    onClick={() => handleMatchClick(match)}
                  />
                ))
              )}
            </div>
          </div>

          <Card className="portal-panel shadow-none">
            <CardContent className="p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="portal-label">Leaderboards</p>
                  <h2 className="font-display text-2xl font-semibold">Performance table</h2>
                </div>
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <Leaderboard
                batting={batting}
                bowling={bowling}
                players={players}
                tournaments={tournaments}
                filterMatchIds={filteredMatchIds.length < matches.length ? filteredMatchIds : undefined}
              />
            </CardContent>
          </Card>
        </section>
      </main>

      <MatchDetailDialog match={selectedMatch} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
};

export default Home;

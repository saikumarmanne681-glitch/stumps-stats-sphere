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
import { ArrowRight, Calendar, Loader2, Radio, Search, Trophy, Users } from "lucide-react";

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
      const tournamentName = tournaments.find((t) => t.tournament_id === match.tournament_id)?.name?.toLowerCase() || "";
      return [match.match_id, match.team_a, match.team_b, match.venue, match.result, tournamentName].some((v) =>
        v?.toLowerCase().includes(query),
      );
    });
  }, [filterTournament, filterSeason, latestMatches, matchSearch, matches, showAllMatches, tournaments]);

  const featuredSeasons = useMemo(() => {
    const scoped = filterTournament === "all" ? seasons : seasons.filter((s) => s.tournament_id === filterTournament);
    return scoped
      .sort((a, b) => b.year - a.year)
      .slice(0, 3)
      .map((season) => {
        const sMatches = matches.filter((m) => m.season_id === season.season_id);
        const tournament = tournaments.find((t) => t.tournament_id === season.tournament_id);
        const liveCount = sMatches.filter((m) => m.status === "live").length;
        const completedCount = sMatches.filter((m) => m.status === "completed").length;
        const teams = new Set(sMatches.flatMap((m) => [m.team_a, m.team_b]));
        return { season, tournament, matchCount: sMatches.length, liveCount, completedCount, teams: teams.size };
      });
  }, [filterTournament, matches, seasons, tournaments]);

  const heroStats = [
    { label: "Players", value: players.length, icon: Users },
    { label: "Tournaments", value: tournaments.length, icon: Trophy },
    { label: "Live", value: matches.filter((m) => m.status === "live").length, icon: Radio },
    { label: "Updates", value: announcements.length, icon: Calendar },
  ];

  const handleMatchClick = (match: Match) => {
    setSelectedMatch(match);
    setDetailOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <AnnouncementTicker />

      <main className="center-page items-stretch gap-6">
        {/* Hero */}
        <section className="portal-hero overflow-hidden">
          <div className="flex flex-col items-center gap-6">
            <div className="center-stack max-w-4xl space-y-5">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Badge className="portal-pill">🏏 Cricket Hub</Badge>
                <Badge variant="outline" className="rounded-full border-primary/15 bg-primary/5 px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                  Stats · Scores · Standings
                </Badge>
              </div>

              <div className="space-y-3">
                <h1 className="max-w-3xl font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[3.2rem] lg:leading-[1.1]">
                  Your complete cricket analytics portal.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                  Track matches, explore leaderboards, follow live scores, and dive into season-by-season tournament data — all in one place.
                </p>
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {heroStats.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="portal-stat-card">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{label}</span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>
                    <p className="mt-3 font-display text-2xl font-semibold text-foreground">{value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Button className="sm:min-w-[170px]" asChild>
                  <Link to="/leaderboards">Explore leaderboards</Link>
                </Button>
                <Button variant="outline" className="sm:min-w-[170px]" asChild>
                  <Link to="/live">Go to live center</Link>
                </Button>
              </div>
            </div>

            {/* Snapshot card */}
            <Card className="portal-panel max-w-3xl">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="portal-label">Portal snapshot</p>
                    <h2 className="font-display text-xl font-semibold tracking-tight">Quick overview</h2>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/20 text-secondary-foreground">
                    <Trophy className="h-4 w-4" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="portal-mini-card">
                    <p className="portal-label">Latest results</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{latestMatches.length}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Recent scorecards ready to browse.</p>
                  </div>
                  <div className="portal-mini-card">
                    <p className="portal-label">Active seasons</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{seasons.filter((s) => s.status === "ongoing").length}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Ongoing competitions tracked live.</p>
                  </div>
                </div>

                <div className="portal-mini-card">
                  <p className="portal-label">Announcements</p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-lg font-semibold text-foreground">{announcements.length}</p>
                    <Badge variant="secondary" className="rounded-full text-xs">Live feed</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {loading && (
          <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/80 px-4 py-3 text-sm text-muted-foreground shadow-sm backdrop-blur">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Loading score and season data...
          </div>
        )}

        {/* Filters + Seasons */}
        <section className="mx-auto grid w-full max-w-5xl gap-5">
          <Card className="portal-panel shadow-none">
            <CardContent className="p-5">
              <div className="mb-4">
                <p className="portal-label">Filters</p>
                <h2 className="font-display text-xl font-semibold tracking-tight">Browse matches</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
                <Select value={filterTournament} onValueChange={(v) => { setFilterTournament(v); setFilterSeason("all"); }}>
                  <SelectTrigger className="portal-input h-10 w-full"><SelectValue placeholder="Tournament" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tournaments</SelectItem>
                    {tournaments.map((t) => <SelectItem key={t.tournament_id} value={t.tournament_id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterSeason} onValueChange={setFilterSeason}>
                  <SelectTrigger className="portal-input h-10 w-full"><SelectValue placeholder="Season" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All seasons</SelectItem>
                    {relevantSeasons.map((s) => <SelectItem key={s.season_id} value={s.season_id}>{s.year}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" className="h-10 w-full xl:w-auto" onClick={() => { setFilterTournament("all"); setFilterSeason("all"); setMatchSearch(""); }}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="portal-panel shadow-none">
            <CardContent className="p-5">
              <div className="mb-4 flex flex-wrap items-center justify-center gap-3 text-center">
                <div>
                  <p className="portal-label">📋 Seasons Overview</p>
                  <h2 className="font-display text-xl font-semibold tracking-tight">Current campaigns</h2>
                </div>
                <Badge variant="secondary" className="rounded-full text-xs">{featuredSeasons.length} featured</Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {featuredSeasons.length === 0 ? (
                  <div className="portal-mini-card md:col-span-3 text-muted-foreground">No seasons found for the selected tournament.</div>
                ) : (
                  featuredSeasons.map(({ season, tournament, matchCount, completedCount, liveCount, teams }) => (
                    <div key={season.season_id} className="portal-mini-card flex h-full flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{tournament?.name || "Season"}</p>
                          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{tournament?.format || "League"}</p>
                        </div>
                        <Badge variant={season.status === "ongoing" ? "default" : "outline"} className="capitalize shrink-0 text-[10px]">
                          {season.status}
                        </Badge>
                      </div>
                      <div className="flex items-end justify-between gap-2">
                        <div>
                          <p className="text-2xl font-semibold text-foreground">{season.year}</p>
                          {hasSheetDate(season.start_date) && hasSheetDate(season.end_date) && (
                            <p className="text-xs text-muted-foreground">
                              {formatSheetDate(season.start_date, "dd MMM")} – {formatSheetDate(season.end_date, "dd MMM yyyy")}
                            </p>
                          )}
                        </div>
                        <Calendar className="h-4 w-4 text-primary shrink-0" />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-semibold text-foreground">{matchCount}</p>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Matches</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-foreground">{teams}</p>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Teams</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-foreground">{liveCount || completedCount}</p>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Live/Done</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 mt-auto pt-2 border-t border-border/30">
                        <Button variant="outline" size="sm" className="w-full text-xs" asChild>
                          <Link to={`/leaderboards?tournament=${season.tournament_id}&season=${season.season_id}`}>View Standings</Link>
                        </Button>
                        <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
                          <Link to={`/tournament/${season.tournament_id}`}>Tournament Page</Link>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Matches + Leaderboard */}
        <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="portal-panel shadow-none">
            <CardContent className="p-5">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="portal-label">📅 Recent matches</p>
                  <h2 className="font-display text-xl font-semibold tracking-tight">Match feed</h2>
                </div>
                <div className="relative w-full max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={matchSearch}
                    onChange={(e) => setMatchSearch(e.target.value)}
                    placeholder="Search team, venue, tournament..."
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {displayMatches.length === 0 ? (
                  <div className="portal-mini-card md:col-span-2 text-muted-foreground">No matches found.</div>
                ) : (
                  displayMatches.map((match) => (
                    <MatchCard
                      key={match.match_id}
                      match={match}
                      tournament={tournaments.find((t) => t.tournament_id === match.tournament_id)}
                      season={seasons.find((s) => s.season_id === match.season_id)}
                      players={players}
                      batting={batting}
                      onClick={() => handleMatchClick(match)}
                    />
                  ))
                )}
              </div>

              {latestMatches.length > 8 && (
                <div className="mt-4 flex justify-center">
                  <Button variant="ghost" className="rounded-full text-sm" onClick={() => setShowAllMatches((p) => !p)}>
                    {showAllMatches ? "Show less" : "Show more matches"}
                    <ArrowRight className={`h-4 w-4 transition-transform ${showAllMatches ? "rotate-90" : ""}`} />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="portal-panel shadow-none">
              <CardContent className="p-5">
                <div className="mb-4 flex flex-wrap items-center justify-center gap-3 text-center">
                  <div>
                    <p className="portal-label">Leaderboards</p>
                    <h2 className="font-display text-xl font-semibold tracking-tight">Top performers</h2>
                  </div>
                  <Badge variant="outline" className="rounded-full text-xs">Filtered</Badge>
                </div>
                <Leaderboard batting={batting} bowling={bowling} players={players} tournaments={tournaments} filterMatchIds={filteredMatchIds} />
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <MatchDetailDialog
        match={selectedMatch}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        batting={batting}
        bowling={bowling}
        players={players}
        tournament={selectedMatch ? tournaments.find((t) => t.tournament_id === selectedMatch.tournament_id) : undefined}
        season={selectedMatch ? seasons.find((s) => s.season_id === selectedMatch.season_id) : undefined}
      />
    </div>
  );
};

export default Home;

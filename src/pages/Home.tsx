import { useState, useMemo } from "react";
import { AnnouncementTicker } from "@/components/AnnouncementTicker";
import { Leaderboard } from "@/components/Leaderboard";
import { MatchCard } from "@/components/MatchCard";
import { MatchDetailDialog } from "@/components/MatchDetailDialog";
import { Navbar } from "@/components/Navbar";
import { LottieMotion } from "@/components/LottieMotion";
import { useData } from "@/lib/DataContext";
import { getLatestMatches } from "@/lib/calculations";
import { Match } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Calendar, Users, TrendingUp, Shield, ExternalLink, Lock, Sparkles, PlayCircle, Radar, Stars, ArrowRight, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { SessionFingerprint, DataIntegrityBadge, SecurityShieldBadge } from "@/components/SecurityBadge";
import { formatSheetDate, hasSheetDate } from "@/lib/dataUtils";

const Home = () => {
  const { players, tournaments, seasons, matches, batting, bowling, announcements, loading } = useData();
  const [filterTournament, setFilterTournament] = useState<string>("all");
  const [filterSeason, setFilterSeason] = useState<string>("all");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [matchSearch, setMatchSearch] = useState("");

  const latestMatches = useMemo(() => getLatestMatches(matches, 9), [matches]);

  const relevantSeasons = useMemo(() => {
    if (filterTournament === "all") return seasons;
    return seasons.filter((s) => s.tournament_id === filterTournament);
  }, [filterTournament, seasons]);

  const filteredMatchIds = useMemo(() => {
    let filtered = matches;
    if (filterTournament !== "all") filtered = filtered.filter((m) => m.tournament_id === filterTournament);
    if (filterSeason !== "all") filtered = filtered.filter((m) => m.season_id === filterSeason);
    return filtered.map((m) => m.match_id);
  }, [filterTournament, filterSeason, matches]);

  const displayMatches = useMemo(() => {
    const sourceMatches = showAllMatches ? getLatestMatches(matches, matches.length) : latestMatches;
    let result = sourceMatches;
    if (filterTournament !== "all") result = result.filter((m) => m.tournament_id === filterTournament);
    if (filterSeason !== "all") result = result.filter((m) => m.season_id === filterSeason);

    const query = matchSearch.trim().toLowerCase();
    if (!query) return result;

    return result.filter((m) => {
      const tName = tournaments.find((t) => t.tournament_id === m.tournament_id)?.name?.toLowerCase() || "";
      return [m.match_id, m.team_a, m.team_b, m.venue, m.result, tName].some((value) =>
        value?.toLowerCase().includes(query),
      );
    });
  }, [showAllMatches, matches, latestMatches, filterTournament, filterSeason, matchSearch, tournaments]);

  const handleMatchClick = (match: Match) => {
    setSelectedMatch(match);
    setDetailOpen(true);
  };

  const seasonCards = useMemo(() => {
    const filtered = filterTournament === "all" ? seasons : seasons.filter((s) => s.tournament_id === filterTournament);
    return filtered
      .sort((a, b) => b.year - a.year)
      .slice(0, 6)
      .map((season) => {
        const tournament = tournaments.find((t) => t.tournament_id === season.tournament_id);
        const seasonMatches = matches.filter((m) => m.season_id === season.season_id);
        const completedMatches = seasonMatches.filter((m) => m.status === "completed");
        const liveMatches = seasonMatches.filter((m) => m.status === "live");
        const teams = new Set<string>();
        seasonMatches.forEach((m) => {
          teams.add(m.team_a);
          teams.add(m.team_b);
        });
        return {
          season,
          tournament,
          totalMatches: seasonMatches.length,
          completedMatches: completedMatches.length,
          liveMatches: liveMatches.length,
          teams: teams.size,
        };
      });
  }, [seasons, tournaments, matches, filterTournament]);

  const heroStats = [
    { label: "Players tracked", value: players.length, icon: Users },
    { label: "Active tournaments", value: tournaments.length, icon: Trophy },
    { label: "Seasons live", value: seasons.filter((season) => season.status === "ongoing").length, icon: Radar },
    { label: "Broadcast updates", value: announcements.length, icon: Sparkles },
  ];

  const experienceCards = [
    {
      title: "Cinematic dashboards",
      description: "Glassmorphism layers, dynamic gradients, and motion-first layouts make every panel feel premium.",
      icon: Stars,
    },
    {
      title: "Real-time energy",
      description: "Live scoring, smart filters, and quicker scanning reduce friction while keeping the portal exciting.",
      icon: TrendingUp,
    },
    {
      title: "Trusted workflows",
      description: "Security indicators and certified data touchpoints are integrated directly into the refreshed experience.",
      icon: Shield,
    },
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <Navbar />
      <AnnouncementTicker />

      <section className="relative isolate overflow-hidden px-4 pb-10 pt-8 md:px-6 md:pb-14 md:pt-10">
        <div className="hero-grid absolute inset-0 opacity-70" />
        <div className="hero-orb hero-orb-cyan" />
        <div className="hero-orb hero-orb-violet" />
        <div className="hero-orb hero-orb-gold" />

        <div className="container relative mx-auto">
          <div className="hero-panel px-6 py-8 md:px-10 md:py-12">
            <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-8 text-left">
                <Badge className="hero-badge">
                  <Sparkles className="h-3.5 w-3.5" /> Newly redesigned immersive cricket command center
                </Badge>

                <div className="space-y-5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs uppercase tracking-[0.4em] text-white/70 backdrop-blur-xl">
                    <PlayCircle className="h-4 w-4 text-cyan-300" /> Motion driven experience
                  </div>
                  <h1 className="font-display text-5xl font-black leading-[0.92] text-white sm:text-6xl xl:text-7xl">
                    Stumps Stats Sphere,
                    <span className="mt-2 block bg-gradient-to-r from-cyan-200 via-white to-fuchsia-200 bg-clip-text text-transparent">
                      reimagined with next-level UI.
                    </span>
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-slate-200 md:text-xl">
                    A premium cricket portal with cinematic gradients, smoother motion, elevated typography, and richer data storytelling across every major surface.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {heroStats.map(({ label, value, icon: Icon }) => (
                    <div key={label} className="hero-stat-card">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-[0.3em] text-white/60">{label}</span>
                        <Icon className="h-4 w-4 text-cyan-200" />
                      </div>
                      <p className="mt-4 font-display text-4xl font-bold text-white">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button size="lg" className="min-w-[180px]" asChild>
                    <Link to="/leaderboards">
                      Explore analytics <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white" asChild>
                    <Link to="/live">
                      Open live center <Radar className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <SecurityShieldBadge label="Public Secure Portal" variant="certified" />
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs text-white/75 backdrop-blur-xl">
                    <Lock className="h-3.5 w-3.5" /> Live updates, certified scorelists, and elevated visual rhythm.
                  </div>
                  <SessionFingerprint />
                </div>
              </div>

              <div className="space-y-5">
                <LottieMotion variant="dashboard" className="hero-visual min-h-[320px] border-white/10 bg-white/10" speed={0.95} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="feature-chip">
                    <span className="feature-chip-icon bg-cyan-400/20 text-cyan-100"><Sparkles className="h-4 w-4" /></span>
                    <div>
                      <p className="font-display text-lg text-white">Animated interface</p>
                      <p className="text-sm text-white/65">Lottie-powered energy added to the hero and content journey.</p>
                    </div>
                  </div>
                  <div className="feature-chip">
                    <span className="feature-chip-icon bg-fuchsia-400/20 text-fuchsia-100"><Shield className="h-4 w-4" /></span>
                    <div>
                      <p className="font-display text-lg text-white">Premium surfaces</p>
                      <p className="text-sm text-white/65">Sharper cards, modern shadows, and cleaner hierarchy.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto space-y-10 px-4 pb-16 md:px-6">
        {loading && (
          <div className="rounded-[1.4rem] border border-white/15 bg-white/55 px-4 py-3 text-sm text-muted-foreground shadow-[0_20px_40px_-32px_rgba(76,29,149,0.5)] backdrop-blur-xl">
            Loading latest data, please wait...
          </div>
        )}

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="page-shell px-6 py-6 md:px-8 md:py-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow">control deck</p>
                <h2 className="section-heading">Polished filters with a brighter visual system</h2>
              </div>
              <Badge variant="secondary" className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.3em]">Dynamic filtering</Badge>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
              <Select value={filterTournament} onValueChange={(v) => { setFilterTournament(v); setFilterSeason("all"); }}>
                <SelectTrigger className="neo-input h-14 w-full rounded-[1.3rem]">
                  <SelectValue placeholder="Tournament" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tournaments</SelectItem>
                  {tournaments.map((t) => (
                    <SelectItem key={t.tournament_id} value={t.tournament_id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSeason} onValueChange={setFilterSeason}>
                <SelectTrigger className="neo-input h-14 w-full rounded-[1.3rem]">
                  <SelectValue placeholder="Season Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Seasons</SelectItem>
                  {relevantSeasons.map((s) => (
                    <SelectItem key={s.season_id} value={s.season_id}>
                      {s.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" className="h-14 rounded-[1.3rem] px-6">
                <Search className="h-4 w-4" /> Refine view
              </Button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {experienceCards.map(({ title, description, icon: Icon }) => (
                <div key={title} className="glass-card min-h-[170px] p-5">
                  <div className="mb-4 inline-flex rounded-2xl border border-primary/10 bg-primary/10 p-3 text-primary shadow-inner shadow-white/40">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-xl font-bold">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="page-shell hero-gradient px-6 py-6 md:px-8 md:py-8">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">motion module</p>
                <h2 className="section-heading">A more alive and expressive home page</h2>
              </div>
              <Stars className="h-5 w-5 text-primary" />
            </div>
            <LottieMotion variant="celebration" className="min-h-[240px]" speed={0.9} />
            <p className="mt-5 text-sm leading-7 text-muted-foreground">
              The refresh introduces richer motion, stronger contrast, softer depth, and a modern font pairing for a more premium first impression.
            </p>
          </div>
        </section>

        <section>
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">competition intelligence</p>
              <h2 className="section-heading">Leaderboards, now framed like a premium analytics suite</h2>
            </div>
            <Badge className="rounded-full border border-primary/15 bg-primary/10 px-4 py-2 text-primary">Live ranking visuals</Badge>
          </div>
          <div className="page-shell px-3 py-3 md:px-5 md:py-5">
            <Leaderboard
              batting={batting}
              bowling={bowling}
              players={players}
              tournaments={tournaments}
              filterMatchIds={filteredMatchIds.length < matches.length ? filteredMatchIds : undefined}
            />
          </div>
        </section>

        <section>
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">season spotlight</p>
              <h2 className="section-heading">Fresh overview cards with better spacing, contrast, and depth</h2>
            </div>
            <Badge variant="outline" className="rounded-full px-4 py-2">{seasonCards.length} featured seasons</Badge>
          </div>
          {seasonCards.length === 0 ? (
            <div className="page-shell px-6 py-10 text-center text-muted-foreground">No seasons found for the selected filters.</div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {seasonCards.map(({ season, tournament, totalMatches, completedMatches, liveMatches, teams }) => (
                <Card key={season.season_id} className="group overflow-hidden border-white/80 bg-white/78">
                  <CardContent className="p-0">
                    <div className="bg-[linear-gradient(135deg,rgba(14,165,233,0.14),rgba(168,85,247,0.14),rgba(255,255,255,0.82))] p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl bg-white/80 p-3 shadow-[0_12px_25px_-18px_rgba(76,29,149,0.7)]">
                            <Trophy className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{tournament?.format || "League"}</p>
                            <span className="font-display text-lg font-bold">{tournament?.name}</span>
                          </div>
                        </div>
                        <Badge variant={season.status === "ongoing" ? "default" : season.status === "upcoming" ? "secondary" : "outline"} className="capitalize">
                          {season.status === "ongoing" && "🔴 "}{season.status}
                        </Badge>
                      </div>
                      <div className="mt-6 flex items-center gap-3 text-primary">
                        <Calendar className="h-5 w-5" />
                        <span className="font-display text-4xl font-black leading-none">{season.year}</span>
                      </div>
                    </div>

                    <div className="space-y-5 p-5">
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="metric-tile p-3">
                          <p className="text-2xl font-bold text-primary">{totalMatches}</p>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Matches</p>
                        </div>
                        <div className="metric-tile p-3">
                          <p className="text-2xl font-bold text-primary">{completedMatches}</p>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Completed</p>
                        </div>
                        <div className="metric-tile p-3">
                          <p className="text-2xl font-bold text-primary">{teams}</p>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Teams</p>
                        </div>
                      </div>

                      {liveMatches > 0 && (
                        <Badge className="rounded-full bg-destructive px-4 py-2 text-destructive-foreground animate-pulse">{liveMatches} LIVE</Badge>
                      )}

                      {hasSheetDate(season.start_date) && hasSheetDate(season.end_date) && (
                        <p className="text-xs text-muted-foreground">
                          {formatSheetDate(season.start_date, "dd MMM")} – {formatSheetDate(season.end_date, "dd MMM yyyy")}
                        </p>
                      )}

                      <div className="glass-card p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Quick access</p>
                            <p className="text-sm font-medium">Filtered leaderboard and official tournament hub</p>
                          </div>
                          <Shield className="h-4 w-4 text-primary" />
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <DataIntegrityBadge data={`${season.season_id}:${season.tournament_id}:${season.year}:${totalMatches}`} label="Season view hash" />
                          <Badge variant="outline" className="text-[10px]">{tournament?.format || "League"}</Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/leaderboards?tournament=${season.tournament_id}&season=${season.season_id}`}>View Standings</Link>
                        </Button>
                        <Button variant="secondary" size="sm" asChild>
                          <Link to={`/tournament/${season.tournament_id}`}>Tournament Page</Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/tournament/${season.tournament_id}#season-${season.season_id}`}>
                            Open Season Hub <ExternalLink className="h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="eyebrow">match theatre</p>
              <h2 className="section-heading">A richer match feed with elevated search and visual rhythm</h2>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={matchSearch}
                onChange={(e) => setMatchSearch(e.target.value)}
                placeholder="Search by team, venue, tournament, result..."
                className="neo-input h-12 sm:w-80"
              />
              <Button variant="outline" onClick={() => setShowAllMatches((prev) => !prev)}>
                {showAllMatches ? "Show Latest" : "Show More"}
              </Button>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {displayMatches.map((match) => (
                <MatchCard
                  key={match.match_id}
                  match={match}
                  tournament={tournaments.find((t) => t.tournament_id === match.tournament_id)}
                  onClick={handleMatchClick}
                />
              ))}
            </div>

            <div className="page-shell px-6 py-6 md:px-8 md:py-8">
              <p className="eyebrow">ambient motion</p>
              <h3 className="font-display text-3xl font-bold">Motion accents continue across the content flow.</h3>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                Rather than only coloring the interface, this redesign adds pace and emotion with smooth movement and layered composition.
              </p>
              <div className="mt-6 space-y-4">
                <LottieMotion variant="pending" className="min-h-[180px]" speed={1.05} />
                <div className="glass-card p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Design goals</p>
                  <ul className="mt-3 space-y-2 text-sm text-foreground/85">
                    <li>• More premium color contrast and cleaner hierarchy</li>
                    <li>• Better use of gradients, glass surfaces, and shadows</li>
                    <li>• Stronger emphasis on movement and typography</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <MatchDetailDialog match={selectedMatch} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
};

export default Home;

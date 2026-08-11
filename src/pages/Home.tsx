import { useState } from "react";
import { AnnouncementTicker } from "@/components/AnnouncementTicker";
import { Leaderboard } from "@/components/Leaderboard";
import { MatchCard } from "@/components/MatchCard";
import { MatchDetailDialog } from "@/components/MatchDetailDialog";
import { Navbar } from "@/components/Navbar";
import { useData } from "@/lib/DataContext";
import { useHomePageData } from "@/lib/dataHooks";
import { Match } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarDays, Filter, Lock, Sparkles, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Link } from "react-router-dom";
import { SessionFingerprint, SecurityShieldBadge } from "@/components/SecurityBadge";
import { VerticalAnnouncementsBox } from "@/components/VerticalAnnouncementsBox";
import { formatInIST } from "@/lib/time";



const Home = () => {
  const { players, tournaments, seasons, matches, batting, bowling, loading, lastRefresh } = useData();
  const [filterTournament, setFilterTournament] = useState<string>("all");
  const [filterSeason, setFilterSeason] = useState<string>("all");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [matchSearch, setMatchSearch] = useState("");

  const { relevantSeasons, filteredMatchIds, displayMatches } = useHomePageData({
    filterTournament,
    filterSeason,
    showAllMatches,
    matchSearch,
  });

  const handleMatchClick = (match: Match) => {
    setSelectedMatch(match);
    setDetailOpen(true);
  };


  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <AnnouncementTicker />

      <section className="relative overflow-hidden hero-surface px-4 py-16 md:py-20">
        <span className="pointer-events-none absolute inset-0 opacity-30 mandala-sports-bg" />
        <span className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gold/20 blur-3xl animate-float" />
        <span className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="container relative mx-auto text-center">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/90 backdrop-blur animate-fade-in">
            <Sparkles className="h-3.5 w-3.5" /> Premium Cricket Intelligence
          </span>
          <h1 className="mb-4 font-display text-4xl font-extrabold tracking-tight text-primary-foreground animate-rise-in md:text-6xl">
            Stumps <span className="text-gradient-gold">Stats</span> Sphere
          </h1>
          <div className="mx-auto mb-5 h-0.5 w-28 gold-divider" />
          <p className="mx-auto max-w-xl text-base text-primary-foreground/85 animate-rise-in md:text-lg">
            Unified platform for cricket operations, scoring, player management, certificates, and community workflows.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            {tournaments.map((t, i) => (
              <Badge key={t.tournament_id} variant="outline" className="animate-scale-in border-primary-foreground/25 bg-primary-foreground/10 text-sm text-primary-foreground backdrop-blur" style={{ animationDelay: `${i * 60}ms` }}>
                {t.name} • {t.format}
              </Badge>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <SecurityShieldBadge label="Public Secure Portal" variant="certified" />
            <span className="inline-flex items-center gap-1 text-primary-foreground/70 text-xs">
              <Lock className="h-3 w-3" /> Live updates, certified scorelists, and filtered standings.
            </span>
            <SessionFingerprint />
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 space-y-10">
        {loading && (
          <div className="flex items-center gap-3 rounded-2xl border border-primary/12 bg-card/80 px-4 py-3 text-sm text-muted-foreground shadow-soft">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Loading latest data, please wait...
          </div>
        )}
        {!navigator.onLine && (
          <div className="rounded-2xl border border-warning/35 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
            You are offline. Showing last available data snapshot.
          </div>
        )}
        <VerticalAnnouncementsBox />

        {/* Leaderboards */}
        <section className="section-shell animate-rise-in">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="font-display text-2xl font-bold">🏆 Leaderboards</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-none bg-primary/10 text-primary">
                <Filter className="mr-1 h-3.5 w-3.5" /> Filter standings
              </Badge>
              {(filterTournament !== "all" || filterSeason !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterTournament("all");
                    setFilterSeason("all");
                  }}
                >
                  <X className="mr-1 h-4 w-4" /> Clear filters
                </Button>
              )}
            </div>
          </div>
          <div className="mb-5 grid gap-3 rounded-2xl border border-primary/12 bg-card/80 p-4 shadow-soft lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <Select value={filterTournament} onValueChange={(v) => { setFilterTournament(v); setFilterSeason("all"); }}>
              <SelectTrigger>
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
              <SelectTrigger>
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
            <div className="flex h-full items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              {filteredMatchIds.length} filtered matches
            </div>
          </div>
          <Leaderboard
            batting={batting}
            bowling={bowling}
            players={players}
            tournaments={tournaments}
            filterMatchIds={filteredMatchIds.length < matches.length ? filteredMatchIds : undefined}
          />
        </section>

        <section className="section-shell animate-rise-in">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold">📋 Seasons Overview moved to its own page</h2>
              <p className="text-sm text-muted-foreground">Home now stays focused on leaderboards and latest matches. Open the dedicated seasons hub for tournament-season browsing.</p>
            </div>
            <Button asChild variant="premium" className="shrink-0">
              <Link to="/seasons">Open Seasons Overview</Link>
            </Button>
          </div>
        </section>

        {/* Matches */}
        <section className="section-shell animate-rise-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <h2 className="font-display text-2xl font-bold">📅 {showAllMatches ? "All Matches" : "Latest Matches"}</h2>
              <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                Showing {displayMatches.length} match{displayMatches.length === 1 ? "" : "es"} in the current view.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={matchSearch}
                onChange={(e) => setMatchSearch(e.target.value)}
                placeholder="Search by team, venue, tournament, result..."
                className="sm:w-80"
              />
              <Button variant="outline" onClick={() => setShowAllMatches((prev) => !prev)}>
                {showAllMatches ? "Show Latest" : "More"}
              </Button>
            </div>
          </div>
          <div className="mb-4 inline-flex rounded-full border border-primary/15 bg-primary/8 p-1.5 shadow-soft">
            <Button
              size="sm"
              variant={!showAllMatches ? "default" : "ghost"}
              className="rounded-full"
              onClick={() => setShowAllMatches(false)}
            >
              Latest Matches
            </Button>
            <Button
              size="sm"
              variant={showAllMatches ? "default" : "ghost"}
              className="rounded-full"
              onClick={() => setShowAllMatches(true)}
            >
              All Matches
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayMatches.map((match, i) => (
              <div key={match.match_id} className="animate-rise-in" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
              <MatchCard
                key={match.match_id}
                match={match}
                tournament={tournaments.find((t) => t.tournament_id === match.tournament_id)}
                season={seasons.find((s) => s.season_id === match.season_id)}
                players={players}
                batting={batting}
                onClick={() => handleMatchClick(match)}
              />
              </div>
            ))}
          </div>
          {displayMatches.length === 0 && <p className="text-muted-foreground text-center py-8">No matches found.</p>}
        </section>
      </div>

      <MatchDetailDialog
        match={selectedMatch}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        batting={batting}
        bowling={bowling}
        players={players}
        tournament={
          selectedMatch ? tournaments.find((t) => t.tournament_id === selectedMatch.tournament_id) : undefined
        }
        season={
          selectedMatch ? seasons.find((s) => s.season_id === selectedMatch.season_id) : undefined
        }
      />

      <footer className="mt-10 border-t border-primary/10 bg-card/80 py-7 backdrop-blur">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2"><Logo name="main-logo" size={24} alt="Stumps Stats Sphere logo" /> © Stumps Stats Sphere</span> · Last data refresh: {lastRefresh ? `${formatInIST(lastRefresh)} IST` : 'N/A'}.
        </div>
      </footer>
    </div>
  );
};

export default Home;

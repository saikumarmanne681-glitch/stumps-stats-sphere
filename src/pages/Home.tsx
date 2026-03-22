import { useState, useMemo } from "react";
import { AnnouncementTicker } from "@/components/AnnouncementTicker";
import { Leaderboard } from "@/components/Leaderboard";
import { MatchCard } from "@/components/MatchCard";
import { MatchDetailDialog } from "@/components/MatchDetailDialog";
import { Navbar } from "@/components/Navbar";
import { useData } from "@/lib/DataContext";
import { getLatestMatches } from "@/lib/calculations";
import { Match } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { SessionFingerprint, SecurityShieldBadge } from "@/components/SecurityBadge";

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


  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <AnnouncementTicker />

      <section className="bg-gradient-to-br from-primary to-primary/80 py-16 px-4">
        <div className="container mx-auto text-center">
          <h1 className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
            CRICKET CLUB PORTAL
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto">
            Track tournaments, matches, player stats, and leaderboards — all in one place.
          </p>
          <div className="flex justify-center gap-2 mt-6 flex-wrap">
            {tournaments.map((t) => (
              <Badge key={t.tournament_id} variant="secondary" className="text-sm">
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
          <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Loading latest data, please wait...
          </div>
        )}
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-display text-lg font-semibold">Filters:</span>
          <Select value={filterTournament} onValueChange={(v) => { setFilterTournament(v); setFilterSeason("all"); }}>
            <SelectTrigger className="w-48">
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
            <SelectTrigger className="w-48">
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
        </div>

        {/* Leaderboards */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-4">🏆 Leaderboards</h2>
          <Leaderboard
            batting={batting}
            bowling={bowling}
            players={players}
            tournaments={tournaments}
            filterMatchIds={filteredMatchIds.length < matches.length ? filteredMatchIds : undefined}
          />
        </section>

        <section className="rounded-3xl border border-primary/10 bg-gradient-to-r from-primary/5 via-accent/10 to-primary/5 px-6 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold">📋 Seasons Overview moved to its own page</h2>
              <p className="text-sm text-muted-foreground">Home now stays focused on leaderboards and latest matches. Open the dedicated seasons hub for tournament-season browsing.</p>
            </div>
            <Button asChild>
              <Link to="/seasons">Open Seasons Overview</Link>
            </Button>
          </div>
        </section>

        {/* Matches */}
        <section>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h2 className="font-display text-2xl font-bold">📅 {showAllMatches ? "All Matches" : "Latest Matches"}</h2>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayMatches.map((match) => (
              <MatchCard
                key={match.match_id}
                match={match}
                tournament={tournaments.find((t) => t.tournament_id === match.tournament_id)}
                season={seasons.find((s) => s.season_id === match.season_id)}
                players={players}
                batting={batting}
                onClick={() => handleMatchClick(match)}
              />
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

      <footer className="bg-card border-t py-6 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2025 Cricket Club Portal. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Home;

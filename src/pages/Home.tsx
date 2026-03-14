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

const Home = () => {
  const { players, tournaments, seasons, matches, batting, bowling, announcements, loading } = useData();
  const [filterTournament, setFilterTournament] = useState<string>("all");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [matchSearch, setMatchSearch] = useState("");

  const latestMatches = useMemo(() => getLatestMatches(matches, 9), [matches]);

  const filteredMatchIds = useMemo(() => {
    if (filterTournament === "all") return undefined;
    return matches.filter((m) => m.tournament_id === filterTournament).map((m) => m.match_id);
  }, [filterTournament, matches]);

  const displayMatches = useMemo(() => {
    const sourceMatches = showAllMatches ? getLatestMatches(matches, matches.length) : latestMatches;
    const tournamentFiltered =
      filterTournament === "all" ? sourceMatches : sourceMatches.filter((m) => m.tournament_id === filterTournament);

    const query = matchSearch.trim().toLowerCase();
    if (!query) return tournamentFiltered;

    return tournamentFiltered.filter((m) => {
      const tName = tournaments.find((t) => t.tournament_id === m.tournament_id)?.name?.toLowerCase() || "";
      return [m.match_id, m.team_a, m.team_b, m.venue, m.result, tName].some((value) =>
        value?.toLowerCase().includes(query),
      );
    });
  }, [showAllMatches, matches, latestMatches, filterTournament, matchSearch, tournaments]);

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
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 space-y-10">
        <div className="flex items-center gap-4">
          <span className="font-display text-lg font-semibold">Filter by Tournament:</span>
          <Select value={filterTournament} onValueChange={setFilterTournament}>
            <SelectTrigger className="w-48">
              <SelectValue />
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
        </div>

        <section>
          <h2 className="font-display text-2xl font-bold mb-4">🏆 Leaderboards</h2>
          <Leaderboard
            batting={batting}
            bowling={bowling}
            players={players}
            tournaments={tournaments}
            filterMatchIds={filteredMatchIds}
          />
        </section>

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
                players={players}
                onClick={() => handleMatchClick(match)}
              />
            ))}
          </div>
          {displayMatches.length === 0 && <p className="text-muted-foreground text-center py-8">No matches found.</p>}
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold mb-4">📋 Active Seasons</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {seasons
              .filter((s) => s.status !== "completed" || filterTournament !== "all")
              .slice(0, 6)
              .map((season) => {
                const tournament = tournaments.find((t) => t.tournament_id === season.tournament_id);
                return (
                  <div key={season.season_id} className="bg-card border rounded-lg p-4">
                    <p className="text-xs text-muted-foreground font-mono">{season.season_id}</p>
                    <p className="font-display font-semibold">{tournament?.name}</p>
                    <p className="text-sm text-muted-foreground">Year: {season.year}</p>
                    <Badge variant={season.status === "ongoing" ? "default" : "secondary"} className="mt-2">
                      {season.status}
                    </Badge>
                  </div>
                );
              })}
          </div>
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

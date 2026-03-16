import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useData } from "@/lib/DataContext";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { v2api } from "@/lib/v2api";
import { DigitalScorelist } from "@/lib/v2types";
import {
  generateMatchScorelist,
  generateTournamentScorelist,
  verifyScorelist,
  exportScorelistAsJSON,
} from "@/lib/scorelist";
import { Loader2, FileJson, FileText, Shield, ShieldCheck, ShieldX } from "lucide-react";

export function AdminScorelists() {
  const { user } = useAuth();
  const { matches, batting, bowling, players, tournaments, seasons } = useData();
  const { toast } = useToast();

  const [scorelists, setScorelists] = useState<DigitalScorelist[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [selectedMatch, setSelectedMatch] = useState("");
  const [selectedTournament, setSelectedTournament] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("");

  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [viewScorelist, setViewScorelist] = useState<DigitalScorelist | null>(null);

  const refresh = async () => {
    const data = await v2api.getScorelists();
    setScorelists(data);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleGenerateMatch = async () => {
    if (!selectedMatch) return;
    setGenerating(true);

    try {
      const match = matches.find((m) => m.match_id === selectedMatch);

      const tournament = tournaments.find((t) => t.tournament_id === match?.tournament_id);

      const season = seasons.find((s) => s.season_id === match?.season_id);

      if (!match) return;

      await generateMatchScorelist(match, batting, bowling, players, tournament, season, user?.username || "admin");

      toast({ title: "Match scorelist generated" });
      refresh();
    } catch (e) {
      toast({ title: "Error", variant: "destructive" });
    }

    setGenerating(false);
  };

  const handleGenerateTournament = async () => {
    if (!selectedTournament || !selectedSeason) return;

    setGenerating(true);

    try {
      const tournament = tournaments.find((t) => t.tournament_id === selectedTournament);

      const season = seasons.find((s) => s.season_id === selectedSeason);

      const seasonMatches = matches.filter((m) => m.season_id === selectedSeason);

      await generateTournamentScorelist(
        tournament!,
        season!,
        seasonMatches,
        batting,
        bowling,
        players,
        user?.username || "admin",
      );

      toast({ title: "Tournament scorebook generated" });
      refresh();
    } catch (e) {
      toast({ title: "Error", variant: "destructive" });
    }

    setGenerating(false);
  };

  if (loading) return <Loader2 className="animate-spin" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Scorelists</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Select value={selectedMatch} onValueChange={setSelectedMatch}>
              <SelectTrigger>
                <SelectValue placeholder="Select Match" />
              </SelectTrigger>
              <SelectContent>
                {matches.map((m) => (
                  <SelectItem key={m.match_id} value={m.match_id}>
                    {m.team_a} vs {m.team_b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleGenerateMatch} disabled={generating}>
              Generate Match Scorelist
            </Button>
          </div>

          <div className="flex gap-3">
            <Select value={selectedTournament} onValueChange={setSelectedTournament}>
              <SelectTrigger>
                <SelectValue placeholder="Tournament" />
              </SelectTrigger>
              <SelectContent>
                {tournaments.map((t) => (
                  <SelectItem key={t.tournament_id} value={t.tournament_id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSeason} onValueChange={setSelectedSeason}>
              <SelectTrigger>
                <SelectValue placeholder="Season" />
              </SelectTrigger>
              <SelectContent>
                {seasons
                  .filter((s) => s.tournament_id === selectedTournament)
                  .map((s) => (
                    <SelectItem key={s.season_id} value={s.season_id}>
                      {s.year}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Button onClick={handleGenerateTournament} disabled={generating}>
              Generate Tournament Scorebook
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

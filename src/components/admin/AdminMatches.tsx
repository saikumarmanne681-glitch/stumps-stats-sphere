import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useData } from "@/lib/DataContext";
import { Match, BattingScorecard, BowlingScorecard } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { generateId } from "@/lib/utils";
import { Loader2, Plus, Pencil, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface PlayerPerformance {
  player_id: string;
  team: string;
  bat_runs: number;
  bat_balls: number;
  bat_fours: number;
  bat_sixes: number;
  bat_how_out: string;
  bat_bowler_id: string;
  bowl_overs: number;
  bowl_maidens: number;
  bowl_runs: number;
  bowl_wickets: number;
  bowl_extras: number;
  did_bat: boolean;
  did_bowl: boolean;
}

const emptyPerformance = (playerId: string, team: string): PlayerPerformance => ({
  player_id: playerId,
  team,
  bat_runs: 0,
  bat_balls: 0,
  bat_fours: 0,
  bat_sixes: 0,
  bat_how_out: "",
  bat_bowler_id: "",
  bowl_overs: 0,
  bowl_maidens: 0,
  bowl_runs: 0,
  bowl_wickets: 0,
  bowl_extras: 0,
  did_bat: false,
  did_bowl: false,
});

export function AdminMatches() {
  const {
    matches,
    batting,
    bowling,
    players,
    tournaments,
    seasons,
    addMatch,
    updateMatch,
    deleteMatch,
    saveScorecardBulk,
  } = useData();
  const [editMatch, setEditMatch] = useState<Match | null>(null);
  const [matchOpen, setMatchOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<string>("");

  const [scorecardOpen, setScorecardOpen] = useState(false);
  const [scorecardMatchId, setScorecardMatchId] = useState("");
  const [teamAPlayers, setTeamAPlayers] = useState<string[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<string[]>([]);
  const [performances, setPerformances] = useState<PlayerPerformance[]>([]);
  const [scorecardTeamTab, setScorecardTeamTab] = useState<"teamA" | "teamB">("teamA");
  const [isSavingScorecard, setIsSavingScorecard] = useState(false);

  const { toast } = useToast();

  const emptyMatch: Match = {
    match_id: "",
    season_id: "",
    tournament_id: "",
    date: "",
    team_a: "",
    team_b: "",
    venue: "",
    status: "scheduled",
    toss_winner: "",
    toss_decision: "",
    result: "",
    man_of_match: "",
    team_a_score: "",
    team_b_score: "",
  };

  const saveMatchHandler = async () => {
    if (!editMatch?.team_a || !editMatch?.team_b) {
      toast({ title: "Error", description: "Fill teams", variant: "destructive" });
      return;
    }
    if (editMatch.match_id) {
      await updateMatch(editMatch);
    } else {
      const newId = generateId("M");
      await addMatch({ ...editMatch, match_id: newId });
    }
    toast({ title: "Match Saved" });
    setMatchOpen(false);
  };

  const openScorecardEntry = (matchId: string) => {
    const match = matches.find((m) => m.match_id === matchId);
    if (!match) return;
    setScorecardMatchId(matchId);

    const existingBatA = batting
      .filter((b) => b.match_id === matchId && b.team === match.team_a)
      .map((b) => b.player_id);
    const existingBatB = batting
      .filter((b) => b.match_id === matchId && b.team === match.team_b)
      .map((b) => b.player_id);
    const existingBowlA = bowling
      .filter((b) => b.match_id === matchId && b.team === match.team_a)
      .map((b) => b.player_id);
    const existingBowlB = bowling
      .filter((b) => b.match_id === matchId && b.team === match.team_b)
      .map((b) => b.player_id);

    const allTeamAIds = [...new Set([...existingBatA, ...existingBowlA])];
    const allTeamBIds = [...new Set([...existingBatB, ...existingBowlB])];

    setTeamAPlayers(allTeamAIds);
    setTeamBPlayers(allTeamBIds);

    const perfs: PlayerPerformance[] = [];
    const addPerf = (pid: string, team: string) => {
      const batEntry = batting.find((b) => b.match_id === matchId && b.player_id === pid && b.team === team);
      const bowlEntry = bowling.find((b) => b.match_id === matchId && b.player_id === pid && b.team === team);
      perfs.push({
        player_id: pid,
        team,
        bat_runs: batEntry?.runs || 0,
        bat_balls: batEntry?.balls || 0,
        bat_fours: batEntry?.fours || 0,
        bat_sixes: batEntry?.sixes || 0,
        bat_how_out: batEntry?.how_out || "",
        bat_bowler_id: batEntry?.bowler_id || "",
        bowl_overs: bowlEntry?.overs || 0,
        bowl_maidens: bowlEntry?.maidens || 0,
        bowl_runs: bowlEntry?.runs_conceded || 0,
        bowl_wickets: bowlEntry?.wickets || 0,
        bowl_extras: bowlEntry?.extras || 0,
        did_bat: !!batEntry,
        did_bowl: !!bowlEntry,
      });
    };

    allTeamAIds.forEach((pid) => addPerf(pid, match.team_a));
    allTeamBIds.forEach((pid) => addPerf(pid, match.team_b));

    setPerformances(perfs);
    setScorecardTeamTab("teamA");
    setScorecardOpen(true);
  };

  const togglePlayer = (playerId: string, team: "A" | "B") => {
    const match = matches.find((m) => m.match_id === scorecardMatchId);
    if (!match) return;
    const teamName = team === "A" ? match.team_a : match.team_b;
    const setPlayers = team === "A" ? setTeamAPlayers : setTeamBPlayers;
    const currentPlayers = team === "A" ? teamAPlayers : teamBPlayers;

    if (currentPlayers.includes(playerId)) {
      setPlayers((prev) => prev.filter((id) => id !== playerId));
      setPerformances((prev) => prev.filter((p) => !(p.player_id === playerId && p.team === teamName)));
    } else {
      setPlayers((prev) => [...prev, playerId]);
      setPerformances((prev) => [...prev, emptyPerformance(playerId, teamName)]);
    }
  };

  const updatePerf = (playerId: string, team: string, field: keyof PlayerPerformance, value: unknown) => {
    setPerformances((prev) =>
      prev.map((p) => (p.player_id === playerId && p.team === team ? { ...p, [field]: value } : p)),
    );
  };

  const saveScorecard = async () => {
    const match = matches.find((m) => m.match_id === scorecardMatchId);
    if (!match || isSavingScorecard) return;

    const newBatting: BattingScorecard[] = [];
    const newBowling: BowlingScorecard[] = [];

    performances.forEach((p) => {
      if (p.did_bat) {
        const sr = p.bat_balls > 0 ? (p.bat_runs / p.bat_balls) * 100 : 0;
        newBatting.push({
          id: generateId("B"),
          match_id: scorecardMatchId,
          player_id: p.player_id,
          team: p.team,
          runs: p.bat_runs,
          balls: p.bat_balls,
          fours: p.bat_fours,
          sixes: p.bat_sixes,
          strike_rate: Math.round(sr * 100) / 100,
          how_out: p.bat_how_out,
          bowler_id: p.bat_bowler_id,
        });
      }
      if (p.did_bowl) {
        const eco = p.bowl_overs > 0 ? p.bowl_runs / p.bowl_overs : 0;
        newBowling.push({
          id: generateId("BW"),
          match_id: scorecardMatchId,
          player_id: p.player_id,
          team: p.team,
          overs: p.bowl_overs,
          maidens: p.bowl_maidens,
          runs_conceded: p.bowl_runs,
          wickets: p.bowl_wickets,
          economy: Math.round(eco * 100) / 100,
          extras: p.bowl_extras,
        });
      }
    });

    const teamARows = newBatting.filter((b) => b.team === match.team_a);
    const teamBRows = newBatting.filter((b) => b.team === match.team_b);
    const formatScore = (rows: BattingScorecard[]) => {
      const totalRuns = rows.reduce((sum, row) => sum + row.runs, 0);
      const wickets = rows.filter((row) => row.how_out && row.how_out !== "not out").length;
      const overs = (rows.reduce((sum, row) => sum + row.balls, 0) / 6).toFixed(1);
      return `${totalRuns}/${wickets} (${overs})`;
    };
    const teamAScore = formatScore(teamARows);
    const teamBScore = formatScore(teamBRows);

    setIsSavingScorecard(true);
    try {
      await saveScorecardBulk(scorecardMatchId, newBatting, newBowling);
      await updateMatch({ ...match, team_a_score: teamAScore, team_b_score: teamBScore });
      toast({
        title: "Scorecard Saved",
        description: `${newBatting.length} batting & ${newBowling.length} bowling entries saved`,
      });
      setScorecardOpen(false);
    } finally {
      setIsSavingScorecard(false);
    }
  };

  const sel = matches.find((m) => m.match_id === selectedMatch);
  const matchBatting = batting.filter((b) => b.match_id === selectedMatch);
  const matchBowling = bowling.filter((b) => b.match_id === selectedMatch);

  const renderPlayerPerformanceRow = (perf: PlayerPerformance) => {
    const player = players.find((p) => p.player_id === perf.player_id);
    return (
      <div key={`${perf.player_id}-${perf.team}`} className="border rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">
            {player?.name || perf.player_id} <span className="text-xs text-muted-foreground">({perf.player_id})</span>
          </span>
          <Badge variant="outline" className="text-xs">
            {perf.team}
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={perf.did_bat}
              onCheckedChange={(c) => updatePerf(perf.player_id, perf.team, "did_bat", !!c)}
            />
            <Label className="text-sm font-semibold">🏏 Batted</Label>
          </div>
          {perf.did_bat && (
            <div className="grid grid-cols-3 gap-2 pl-6">
              <div>
                <Label className="text-xs">Runs</Label>
                <Input
                  type="number"
                  className="h-8 text-sm"
                  value={perf.bat_runs}
                  onChange={(e) => updatePerf(perf.player_id, perf.team, "bat_runs", Number(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-xs">Balls</Label>
                <Input
                  type="number"
                  className="h-8 text-sm"
                  value={perf.bat_balls}
                  onChange={(e) => updatePerf(perf.player_id, perf.team, "bat_balls", Number(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-xs">4s</Label>
                <Input
                  type="number"
                  className="h-8 text-sm"
                  value={perf.bat_fours}
                  onChange={(e) => updatePerf(perf.player_id, perf.team, "bat_fours", Number(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-xs">6s</Label>
                <Input
                  type="number"
                  className="h-8 text-sm"
                  value={perf.bat_sixes}
                  onChange={(e) => updatePerf(perf.player_id, perf.team, "bat_sixes", Number(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-xs">How Out</Label>
                <Input
                  className="h-8 text-sm"
                  value={perf.bat_how_out}
                  onChange={(e) => updatePerf(perf.player_id, perf.team, "bat_how_out", e.target.value)}
                  placeholder="caught, not out..."
                />
              </div>
              <div>
                <Label className="text-xs">Bowler</Label>
                <Select
                  value={perf.bat_bowler_id}
                  onValueChange={(v) => updatePerf(perf.player_id, perf.team, "bat_bowler_id", v)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">N/A</SelectItem>
                    {players.map((p) => (
                      <SelectItem key={p.player_id} value={p.player_id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={perf.did_bowl}
              onCheckedChange={(c) => updatePerf(perf.player_id, perf.team, "did_bowl", !!c)}
            />
            <Label className="text-sm font-semibold">🎯 Bowled</Label>
          </div>
          {perf.did_bowl && (
            <div className="grid grid-cols-3 gap-2 pl-6">
              <div>
                <Label className="text-xs">Overs</Label>
                <Input
                  type="number"
                  step="0.1"
                  className="h-8 text-sm"
                  value={perf.bowl_overs}
                  onChange={(e) => updatePerf(perf.player_id, perf.team, "bowl_overs", Number(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-xs">Maidens</Label>
                <Input
                  type="number"
                  className="h-8 text-sm"
                  value={perf.bowl_maidens}
                  onChange={(e) => updatePerf(perf.player_id, perf.team, "bowl_maidens", Number(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-xs">Runs</Label>
                <Input
                  type="number"
                  className="h-8 text-sm"
                  value={perf.bowl_runs}
                  onChange={(e) => updatePerf(perf.player_id, perf.team, "bowl_runs", Number(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-xs">Wickets</Label>
                <Input
                  type="number"
                  className="h-8 text-sm"
                  value={perf.bowl_wickets}
                  onChange={(e) => updatePerf(perf.player_id, perf.team, "bowl_wickets", Number(e.target.value))}
                />
              </div>
              <div>
                <Label className="text-xs">Extras</Label>
                <Input
                  type="number"
                  className="h-8 text-sm"
                  value={perf.bowl_extras}
                  onChange={(e) => updatePerf(perf.player_id, perf.team, "bowl_extras", Number(e.target.value))}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const scorecardMatch = matches.find((m) => m.match_id === scorecardMatchId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display">🏏 Matches</CardTitle>
          <Dialog open={matchOpen} onOpenChange={setMatchOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setEditMatch({ ...emptyMatch })}>
                <Plus className="h-4 w-4 mr-1" /> Add Match
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editMatch?.match_id ? "Edit" : "Add"} Match</DialogTitle>
                <DialogDescription>Fill in the match details.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Tournament</Label>
                  <Select
                    value={editMatch?.tournament_id || ""}
                    onValueChange={(v) => setEditMatch((prev) => (prev ? { ...prev, tournament_id: v } : null))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {tournaments.map((t) => (
                        <SelectItem key={t.tournament_id} value={t.tournament_id}>
                          {t.name} ({t.tournament_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Season</Label>
                  <Select
                    value={editMatch?.season_id || ""}
                    onValueChange={(v) => setEditMatch((prev) => (prev ? { ...prev, season_id: v } : null))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {seasons
                        .filter((s) => !editMatch?.tournament_id || s.tournament_id === editMatch.tournament_id)
                        .map((s) => (
                          <SelectItem key={s.season_id} value={s.season_id}>
                            {s.year} ({s.season_id})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={editMatch?.date || ""}
                    onChange={(e) => setEditMatch((prev) => (prev ? { ...prev, date: e.target.value } : null))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Team A</Label>
                    <Input
                      value={editMatch?.team_a || ""}
                      onChange={(e) => setEditMatch((prev) => (prev ? { ...prev, team_a: e.target.value } : null))}
                    />
                  </div>
                  <div>
                    <Label>Team B</Label>
                    <Input
                      value={editMatch?.team_b || ""}
                      onChange={(e) => setEditMatch((prev) => (prev ? { ...prev, team_b: e.target.value } : null))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Team A Score</Label>
                    <Input
                      value={editMatch?.team_a_score || ""}
                      onChange={(e) =>
                        setEditMatch((prev) => (prev ? { ...prev, team_a_score: e.target.value } : null))
                      }
                      placeholder="e.g. 165/4 (20)"
                    />
                  </div>
                  <div>
                    <Label>Team B Score</Label>
                    <Input
                      value={editMatch?.team_b_score || ""}
                      onChange={(e) =>
                        setEditMatch((prev) => (prev ? { ...prev, team_b_score: e.target.value } : null))
                      }
                      placeholder="e.g. 148/7 (18.2)"
                    />
                  </div>
                </div>
                <div>
                  <Label>Venue</Label>
                  <Input
                    value={editMatch?.venue || ""}
                    onChange={(e) => setEditMatch((prev) => (prev ? { ...prev, venue: e.target.value } : null))}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={editMatch?.status || "scheduled"}
                    onValueChange={(v) =>
                      setEditMatch((prev) => (prev ? { ...prev, status: v as Match["status"] } : null))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Toss Winner</Label>
                  <Input
                    value={editMatch?.toss_winner || ""}
                    onChange={(e) => setEditMatch((prev) => (prev ? { ...prev, toss_winner: e.target.value } : null))}
                  />
                </div>
                <div>
                  <Label>Toss Decision</Label>
                  <Input
                    value={editMatch?.toss_decision || ""}
                    onChange={(e) => setEditMatch((prev) => (prev ? { ...prev, toss_decision: e.target.value } : null))}
                  />
                </div>
                <div>
                  <Label>Result</Label>
                  <Input
                    value={editMatch?.result || ""}
                    onChange={(e) => setEditMatch((prev) => (prev ? { ...prev, result: e.target.value } : null))}
                  />
                </div>
                <div>
                  <Label>Man of Match</Label>
                  <Select
                    value={editMatch?.man_of_match || ""}
                    onValueChange={(v) => setEditMatch((prev) => (prev ? { ...prev, man_of_match: v } : null))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {players.map((p) => (
                        <SelectItem key={p.player_id} value={p.player_id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={saveMatchHandler} className="w-full">
                  Save Match
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...matches]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((m) => (
                  <TableRow key={m.match_id} className={selectedMatch === m.match_id ? "bg-primary/5" : ""}>
                    <TableCell className="font-mono text-xs">{m.match_id}</TableCell>
                    <TableCell>{m.date ? format(new Date(m.date), "dd MMM yyyy") : "-"}</TableCell>
                    <TableCell className="font-medium">
                      {m.team_a} vs {m.team_b}
                    </TableCell>
                    <TableCell className="text-xs">
                      {m.team_a_score && (
                        <span className="block">
                          {m.team_a}: {m.team_a_score}
                        </span>
                      )}
                      {m.team_b_score && (
                        <span className="block">
                          {m.team_b}: {m.team_b_score}
                        </span>
                      )}
                      {!m.team_a_score && !m.team_b_score && "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.status === "completed" ? "default" : "secondary"}>{m.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate">{m.result || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Edit match"
                          onClick={() => {
                            setEditMatch(m);
                            setMatchOpen(true);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Edit scorecard"
                          onClick={() => openScorecardEntry(m.match_id)}
                        >
                          <Users className="h-3 w-3 text-primary" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="View scorecard"
                          onClick={() => setSelectedMatch(selectedMatch === m.match_id ? "" : m.match_id)}
                        >
                          📊
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={async () => {
                            await deleteMatch(m.match_id);
                            toast({ title: "Deleted" });
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Scorecard Entry Dialog */}
      <Dialog open={scorecardOpen} onOpenChange={setScorecardOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display">
              📊 Scorecard Entry — {scorecardMatch?.team_a} vs {scorecardMatch?.team_b} ({scorecardMatchId})
            </DialogTitle>
            <DialogDescription>Add players and enter their batting/bowling performance.</DialogDescription>
          </DialogHeader>

          <Tabs
            value={scorecardTeamTab}
            onValueChange={(v) => setScorecardTeamTab(v as "teamA" | "teamB")}
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="teamA">
                {scorecardMatch?.team_a || "Team A"} ({teamAPlayers.length})
              </TabsTrigger>
              <TabsTrigger value="teamB">
                {scorecardMatch?.team_b || "Team B"} ({teamBPlayers.length})
              </TabsTrigger>
            </TabsList>

            <div
              className="flex-1 overflow-y-auto mt-4 pr-2 scrollbar-thin"
              style={{ maxHeight: "calc(90vh - 220px)" }}
            >
              <TabsContent value="teamA" className="space-y-4 mt-0">
                <div className="border rounded-lg p-3">
                  <Label className="text-sm font-semibold mb-2 block">
                    Select players for {scorecardMatch?.team_a}:
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">Same player can appear in both teams</p>
                  <div className="flex flex-wrap gap-2">
                    {players
                      .filter((p) => p.status === "active")
                      .map((p) => (
                        <label
                          key={p.player_id}
                          className="flex items-center gap-1 border rounded px-2 py-1 cursor-pointer hover:bg-muted text-sm"
                        >
                          <Checkbox
                            checked={teamAPlayers.includes(p.player_id)}
                            onCheckedChange={() => togglePlayer(p.player_id, "A")}
                          />
                          {p.name}
                        </label>
                      ))}
                  </div>
                </div>
                {performances.filter((p) => p.team === scorecardMatch?.team_a).map(renderPlayerPerformanceRow)}
              </TabsContent>

              <TabsContent value="teamB" className="space-y-4 mt-0">
                <div className="border rounded-lg p-3">
                  <Label className="text-sm font-semibold mb-2 block">
                    Select players for {scorecardMatch?.team_b}:
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">Same player can appear in both teams</p>
                  <div className="flex flex-wrap gap-2">
                    {players
                      .filter((p) => p.status === "active")
                      .map((p) => (
                        <label
                          key={p.player_id}
                          className="flex items-center gap-1 border rounded px-2 py-1 cursor-pointer hover:bg-muted text-sm"
                        >
                          <Checkbox
                            checked={teamBPlayers.includes(p.player_id)}
                            onCheckedChange={() => togglePlayer(p.player_id, "B")}
                          />
                          {p.name}
                        </label>
                      ))}
                  </div>
                </div>
                {performances.filter((p) => p.team === scorecardMatch?.team_b).map(renderPlayerPerformanceRow)}
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t mt-2">
            <Button variant="outline" onClick={() => setScorecardOpen(false)} disabled={isSavingScorecard}>
              Cancel
            </Button>
            <Button onClick={saveScorecard} disabled={isSavingScorecard}>
              {isSavingScorecard ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "💾 Save All Scorecard"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Scorecard */}
      {selectedMatch && sel && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display">
              📊 Scorecard — {sel.team_a} vs {sel.team_b} ({sel.match_id})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="teamA_view">
              <TabsList>
                <TabsTrigger value="teamA_view">{sel.team_a}</TabsTrigger>
                <TabsTrigger value="teamB_view">{sel.team_b}</TabsTrigger>
              </TabsList>
              {[sel.team_a, sel.team_b].map((team, idx) => {
                const teamBat = matchBatting.filter((b) => b.team === team);
                const teamBowl = matchBowling.filter((b) => b.team === team);
                const totalRuns = teamBat.reduce((s, b) => s + b.runs, 0);
                const totalWickets = teamBat.filter((b) => b.how_out && b.how_out !== "not out").length;
                const scoreDisplay = idx === 0 ? sel.team_a_score : sel.team_b_score;
                return (
                  <TabsContent key={team} value={idx === 0 ? "teamA_view" : "teamB_view"} className="mt-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg font-bold">{team}</span>
                      <Badge className="bg-primary text-primary-foreground">
                        {scoreDisplay || `${totalRuns}/${totalWickets}`}
                      </Badge>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Batting</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Player</TableHead>
                            <TableHead>R</TableHead>
                            <TableHead>B</TableHead>
                            <TableHead>4s</TableHead>
                            <TableHead>6s</TableHead>
                            <TableHead>SR</TableHead>
                            <TableHead>Out</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teamBat.map((b) => (
                            <TableRow key={b.id}>
                              <TableCell className="font-medium">
                                {players.find((p) => p.player_id === b.player_id)?.name || b.player_id}
                              </TableCell>
                              <TableCell className="font-bold">{b.runs}</TableCell>
                              <TableCell>{b.balls}</TableCell>
                              <TableCell>{b.fours}</TableCell>
                              <TableCell>{b.sixes}</TableCell>
                              <TableCell>{b.strike_rate?.toFixed?.(1) || "-"}</TableCell>
                              <TableCell className="text-xs">{b.how_out}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {teamBowl.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Bowling</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Player</TableHead>
                              <TableHead>O</TableHead>
                              <TableHead>M</TableHead>
                              <TableHead>R</TableHead>
                              <TableHead>W</TableHead>
                              <TableHead>Eco</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {teamBowl.map((b) => (
                              <TableRow key={b.id}>
                                <TableCell className="font-medium">
                                  {players.find((p) => p.player_id === b.player_id)?.name || b.player_id}
                                </TableCell>
                                <TableCell>{b.overs}</TableCell>
                                <TableCell>{b.maidens}</TableCell>
                                <TableCell>{b.runs_conceded}</TableCell>
                                <TableCell className="font-bold">{b.wickets}</TableCell>
                                <TableCell>{b.economy?.toFixed?.(1) || "-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

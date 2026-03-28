import { useEffect, useMemo, useState } from "react";
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
import { ClipboardList, Loader2, Pencil, Plus, Search, Sparkles, Trash2, Users, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { MATCH_STAGES } from "@/lib/v2types";
import { logAudit } from "@/lib/v2api";
import { formatDateInIST } from '@/lib/time';

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
  const [scorecardEntryMode, setScorecardEntryMode] = useState<"detailed" | "quick">("detailed");
  const [saveStartedAt, setSaveStartedAt] = useState<number | null>(null);
  const [saveElapsedSeconds, setSaveElapsedSeconds] = useState(0);

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
    match_stage: "",
  };

  const saveMatchHandler = async () => {
    if (!editMatch?.team_a || !editMatch?.team_b) {
      toast({ title: "Error", description: "Fill teams", variant: "destructive" });
      return;
    }
    if (editMatch.match_id) {
      await updateMatch(editMatch);
      logAudit("admin", "admin_save_match", "match", editMatch.match_id, JSON.stringify({ teams: `${editMatch.team_a} vs ${editMatch.team_b}`, status: editMatch.status, stage: editMatch.match_stage || "" }));
    } else {
      const newId = generateId("M");
      await addMatch({ ...editMatch, match_id: newId });
      logAudit("admin", "admin_add_match", "match", newId, JSON.stringify({ teams: `${editMatch.team_a} vs ${editMatch.team_b}`, status: editMatch.status, stage: editMatch.match_stage || "" }));
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
    setScorecardEntryMode("detailed");
    setScorecardPlayerSearch("");
    setScorecardOpen(true);
    logAudit("admin", "open_scorecard_entry", "match", matchId, JSON.stringify({ teamAPlayers: allTeamAIds.length, teamBPlayers: allTeamBIds.length }));
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

  const [savingProgress, setSavingProgress] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!isSavingScorecard || !saveStartedAt) return;
    const interval = setInterval(() => {
      setSaveElapsedSeconds(Math.max(0, Math.floor((Date.now() - saveStartedAt) / 1000)));
    }, 250);
    return () => clearInterval(interval);
  }, [isSavingScorecard, saveStartedAt]);
  const [matchSearch, setMatchSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [scorecardPlayerSearch, setScorecardPlayerSearch] = useState("");

  const getRecentTeamLineup = (teamName: string) => {
    const relatedMatchIds = matches
      .filter((match) => match.team_a === teamName || match.team_b === teamName)
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
      .slice(0, 5)
      .map((match) => match.match_id);

    return Array.from(
      new Set(
        [...batting, ...bowling]
          .filter((row) => relatedMatchIds.includes(row.match_id) && row.team === teamName)
          .map((row) => row.player_id),
      ),
    );
  };

  const applyRecentLineup = (team: "A" | "B") => {
    const match = matches.find((item) => item.match_id === scorecardMatchId);
    if (!match) return;
    const teamName = team === "A" ? match.team_a : match.team_b;
    const recentLineup = getRecentTeamLineup(teamName);
    if (recentLineup.length === 0) {
      toast({ title: "No previous lineup found", description: `No recent scorecard data is available yet for ${teamName}.` });
      return;
    }

    const setPlayers = team === "A" ? setTeamAPlayers : setTeamBPlayers;
    const existingTeamRows = performances.filter((item) => item.team === teamName);
    const existingIds = new Set(existingTeamRows.map((item) => item.player_id));
    const newRows = recentLineup.filter((playerId) => !existingIds.has(playerId)).map((playerId) => emptyPerformance(playerId, teamName));

    setPlayers(Array.from(new Set([...recentLineup])));
    setPerformances((prev) => [
      ...prev.filter((item) => item.team !== teamName),
      ...existingTeamRows,
      ...newRows,
    ]);
    logAudit("admin", "apply_recent_lineup", "match", scorecardMatchId, JSON.stringify({ team: teamName, players: recentLineup.length }));
    toast({ title: "Recent lineup applied", description: `${recentLineup.length} players loaded for ${teamName}.` });
  };

  const filteredPlayers = useMemo(() => {
    const query = scorecardPlayerSearch.trim().toLowerCase();
    return players.filter((player) => player.status === "active" && (!query || `${player.name} ${player.player_id}`.toLowerCase().includes(query)));
  }, [players, scorecardPlayerSearch]);

  const visibleMatches = useMemo(() => {
    const query = matchSearch.trim().toLowerCase();
    return [...matches]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter((match) => {
        if (statusFilter !== "all" && match.status !== statusFilter) return false;
        if (!query) return true;
        return [match.match_id, match.team_a, match.team_b, match.venue, match.result, match.match_stage]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      });
  }, [matches, matchSearch, statusFilter]);

  const latestMatchTemplate = useMemo(() => {
    return [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null;
  }, [matches]);

  const saveScorecard = async () => {
    const match = matches.find((m) => m.match_id === scorecardMatchId);
    if (!match || isSavingScorecard) return;

    const newBatting: BattingScorecard[] = [];
    const newBowling: BowlingScorecard[] = [];

    performances.forEach((p) => {
      if (p.did_bat) {
        const sr = p.bat_balls > 0 ? (p.bat_runs / p.bat_balls) * 100 : 0;
        newBatting.push({
          id: `${scorecardMatchId}_BAT_${p.player_id}_${p.team}`,
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
          id: `${scorecardMatchId}_BOWL_${p.player_id}_${p.team}`,
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

    // Auto-calculate team scores from batting data
    const calcScore = (team: string) => {
      const rows = newBatting.filter((b) => b.team === team);
      const totalRuns = rows.reduce((sum, row) => sum + row.runs, 0);
      const wickets = rows.filter((row) => row.how_out && row.how_out !== "not out").length;
      const totalBalls = rows.reduce((sum, row) => sum + row.balls, 0);
      const overs = Math.floor(totalBalls / 6) + (totalBalls % 6) / 10;
      return `${totalRuns}/${wickets} (${overs.toFixed(1)})`;
    };
    const teamAScore = calcScore(match.team_a);
    const teamBScore = calcScore(match.team_b);

    setIsSavingScorecard(true);
    setSaveStartedAt(Date.now());
    setSaveElapsedSeconds(0);
    setSavingProgress(0);
    setSaveSuccess(false);

    try {
      // Animate progress
      const progressInterval = setInterval(() => {
        setSavingProgress((prev) => Math.min(prev + 8, 90));
      }, 200);

      const atomicSave = await saveScorecardBulk(scorecardMatchId, newBatting, newBowling, {
        scorecardVersion: match.scorecard_version,
        scorecardChecksum: match.scorecard_checksum,
      });
      await updateMatch({
        ...match,
        team_a_score: teamAScore,
        team_b_score: teamBScore,
        scorecard_version: atomicSave.scorecardVersion,
        scorecard_checksum: atomicSave.scorecardChecksum,
        scorecard_operation_id: atomicSave.operationId,
      });

      clearInterval(progressInterval);
      setSavingProgress(100);
      setSaveSuccess(true);

      logAudit("admin", "admin_save_scorecard", "match", scorecardMatchId, JSON.stringify({ battingEntries: newBatting.length, bowlingEntries: newBowling.length, teamAScore, teamBScore, atomicOperationId: atomicSave.operationId }));

      toast({
        title: "✅ Scorecard Saved Successfully!",
        description: `${newBatting.length} batting & ${newBowling.length} bowling entries saved. Scores: ${match.team_a} ${teamAScore} | ${match.team_b} ${teamBScore}`,
      });

      // Show success state briefly then close
      setTimeout(() => {
        setScorecardOpen(false);
        setSaveSuccess(false);
        setSavingProgress(0);
        setSaveStartedAt(null);
        setSaveElapsedSeconds(0);
      }, 1500);
    } catch (err) {
      toast({
        title: "Error saving scorecard",
        description: `${String(err)} Retry after refreshing this match to sync latest scorecard version.`,
        variant: "destructive",
      });
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
              {scorecardEntryMode === "detailed" && (
              <div>
                <Label className="text-xs">Balls</Label>
                <Input
                  type="number"
                  className="h-8 text-sm"
                  value={perf.bat_balls}
                  onChange={(e) => updatePerf(perf.player_id, perf.team, "bat_balls", Number(e.target.value))}
                />
              </div>
              )}
              {scorecardEntryMode === "detailed" && (
              <div>
                <Label className="text-xs">4s</Label>
                <Input
                  type="number"
                  className="h-8 text-sm"
                  value={perf.bat_fours}
                  onChange={(e) => updatePerf(perf.player_id, perf.team, "bat_fours", Number(e.target.value))}
                />
              </div>
              )}
              {scorecardEntryMode === "detailed" && (
              <div>
                <Label className="text-xs">6s</Label>
                <Input
                  type="number"
                  className="h-8 text-sm"
                  value={perf.bat_sixes}
                  onChange={(e) => updatePerf(perf.player_id, perf.team, "bat_sixes", Number(e.target.value))}
                />
              </div>
              )}
              {scorecardEntryMode === "detailed" && (
              <div>
                <Label className="text-xs">How Out</Label>
                <Input
                  className="h-8 text-sm"
                  value={perf.bat_how_out}
                  onChange={(e) => updatePerf(perf.player_id, perf.team, "bat_how_out", e.target.value)}
                  placeholder="caught, not out..."
                />
              </div>
              )}
              {scorecardEntryMode === "detailed" && (
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
              )}
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
              {scorecardEntryMode === "detailed" && (
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
              )}
              {scorecardEntryMode === "detailed" && (
              <div>
                <Label className="text-xs">Maidens</Label>
                <Input
                  type="number"
                  className="h-8 text-sm"
                  value={perf.bowl_maidens}
                  onChange={(e) => updatePerf(perf.player_id, perf.team, "bowl_maidens", Number(e.target.value))}
                />
              </div>
              )}
              {scorecardEntryMode === "detailed" && (
              <div>
                <Label className="text-xs">Runs</Label>
                <Input
                  type="number"
                  className="h-8 text-sm"
                  value={perf.bowl_runs}
                  onChange={(e) => updatePerf(perf.player_id, perf.team, "bowl_runs", Number(e.target.value))}
                />
              </div>
              )}
              <div>
                <Label className="text-xs">Wickets</Label>
                <Input
                  type="number"
                  className="h-8 text-sm"
                  value={perf.bowl_wickets}
                  onChange={(e) => updatePerf(perf.player_id, perf.team, "bowl_wickets", Number(e.target.value))}
                />
              </div>
              {scorecardEntryMode === "detailed" && (
              <div>
                <Label className="text-xs">Extras</Label>
                <Input
                  type="number"
                  className="h-8 text-sm"
                  value={perf.bowl_extras}
                  onChange={(e) => updatePerf(perf.player_id, perf.team, "bowl_extras", Number(e.target.value))}
                />
              </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const scorecardMatch = matches.find((m) => m.match_id === scorecardMatchId);

  return (
    <div className="space-y-6">
      <section className="admin-section-shell soft-dot-grid overflow-hidden p-6">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              <ClipboardList className="h-3.5 w-3.5" /> Fast match ops
            </div>
            <div>
              <h2 className="section-heading">Make daily match entry dramatically faster.</h2>
              <p className="mt-2 text-sm text-muted-foreground">Search fixtures instantly, reuse recent team lineups, and keep scorecard entry focused on speed without changing any match logic.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="metric-tile"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total matches</p><p className="mt-2 text-3xl font-bold text-primary">{matches.length}</p><p className="mt-1 text-sm text-muted-foreground">All scheduled, live, and completed fixtures.</p></div>
              <div className="metric-tile"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Live now</p><p className="mt-2 text-3xl font-bold text-foreground">{matches.filter((m) => m.status === "live").length}</p><p className="mt-1 text-sm text-muted-foreground">Matches currently open for scoring.</p></div>
              <div className="metric-tile"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Completed</p><p className="mt-2 text-3xl font-bold text-foreground">{matches.filter((m) => m.status === "completed").length}</p><p className="mt-1 text-sm text-muted-foreground">Finished fixtures with scorecards available.</p></div>
            </div>
          </div>
          <div className="glass-panel rounded-[1.75rem] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary"><Wand2 className="h-4 w-4" /> Quick-start helper</div>
            <p className="mt-2 text-sm text-muted-foreground">Use the latest saved match as a template for faster entry when tournaments have similar stages and venues.</p>
            {latestMatchTemplate ? (
              <div className="mt-4 rounded-[1.25rem] border border-primary/10 bg-background/80 p-4">
                <p className="font-semibold">{latestMatchTemplate.team_a} vs {latestMatchTemplate.team_b}</p>
                <p className="mt-1 text-xs text-muted-foreground">{latestMatchTemplate.match_stage || "No stage"} • {latestMatchTemplate.venue || "Venue pending"} • {latestMatchTemplate.date || "Date pending"}</p>
                <Button
                  variant="outline"
                  className="mt-4 w-full rounded-xl"
                  onClick={() => {
                    setEditMatch({
                      ...emptyMatch,
                      tournament_id: latestMatchTemplate.tournament_id,
                      season_id: latestMatchTemplate.season_id,
                      venue: latestMatchTemplate.venue,
                      team_a: latestMatchTemplate.team_a,
                      team_b: latestMatchTemplate.team_b,
                      toss_winner: latestMatchTemplate.toss_winner,
                      toss_decision: latestMatchTemplate.toss_decision,
                      match_stage: latestMatchTemplate.match_stage || "",
                    });
                    setMatchOpen(true);
                  }}
                >
                  <Sparkles className="mr-2 h-4 w-4" /> Reuse latest match shell
                </Button>
              </div>
            ) : (
              <div className="mt-4 rounded-[1.25rem] border border-dashed border-primary/20 bg-muted/30 p-6 text-center text-sm text-muted-foreground">Add your first match to unlock one-click templates.</div>
            )}
          </div>
        </div>
      </section>

      <Card className="admin-section-shell overflow-hidden">
        <CardHeader className="flex flex-col gap-4 border-b border-primary/10 bg-gradient-to-r from-background to-primary/5 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="font-display text-xl">🏏 Matches & Scorecards</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Filter fixtures quickly and jump straight into score entry.</p>
          </div>
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
                  <Label>Match Stage</Label>
                  <Select
                    value={editMatch?.match_stage || ""}
                    onValueChange={(v) => setEditMatch((prev) => (prev ? { ...prev, match_stage: v } : null))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=" ">None</SelectItem>
                      {MATCH_STAGES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input value={matchSearch} onChange={(e) => setMatchSearch(e.target.value)} placeholder="Search match ID, teams, stage, venue, or result..." className="rounded-full pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="rounded-full"><SelectValue placeholder="Filter status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleMatches.map((m) => {
                  // Auto-calc scores from batting if not saved on match
                  const calcScore = (team: string) => {
                    const rows = batting.filter(b => b.match_id === m.match_id && b.team === team);
                    if (rows.length === 0) return '';
                    const runs = rows.reduce((s, b) => s + b.runs, 0);
                    const wkts = rows.filter(b => b.how_out && b.how_out !== 'not out').length;
                    const balls = rows.reduce((s, b) => s + b.balls, 0);
                    const overs = Math.floor(balls / 6) + (balls % 6) / 10;
                    return `${runs}/${wkts} (${overs.toFixed(1)})`;
                  };
                  const scoreA = m.team_a_score || calcScore(m.team_a);
                  const scoreB = m.team_b_score || calcScore(m.team_b);
                  return (
                  <TableRow key={m.match_id} className={selectedMatch === m.match_id ? "bg-primary/5" : ""}>
                    <TableCell className="font-mono text-xs">{m.match_id}</TableCell>
                    <TableCell>{m.date ? formatDateInIST(m.date) : "-"}</TableCell>
                    <TableCell className="font-medium">
                      {m.team_a} vs {m.team_b}
                    </TableCell>
                    <TableCell className="text-xs">
                      {scoreA && (
                        <span className="block">
                          {m.team_a}: {scoreA}
                        </span>
                      )}
                      {scoreB && (
                        <span className="block">
                          {m.team_b}: {scoreB}
                        </span>
                      )}
                      {!scoreA && !scoreB && "-"}
                    </TableCell>
                    <TableCell>
                      {m.match_stage ? <Badge variant="outline" className="rounded-full">{m.match_stage}</Badge> : <span className="text-xs text-muted-foreground">-</span>}
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
                  );
                })}
              {visibleMatches.length === 0 && (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No matches found for the current filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Scorecard Entry Dialog */}
      <Dialog open={scorecardOpen} onOpenChange={setScorecardOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col rounded-[2rem] border-primary/10">
          <DialogHeader>
            <DialogTitle className="font-display">
              📊 Scorecard Entry — {scorecardMatch?.team_a} vs {scorecardMatch?.team_b} ({scorecardMatchId})
            </DialogTitle>
          <DialogDescription>Use search, recent lineup presets, and live score previews to finish entry faster.</DialogDescription>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Label className="text-xs text-muted-foreground">Entry mode</Label>
            <Select value={scorecardEntryMode} onValueChange={(v) => setScorecardEntryMode(v as "detailed" | "quick")}>
              <SelectTrigger className="h-8 w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="detailed">Detailed (all scorecard fields)</SelectItem>
                <SelectItem value="quick">Quick (bat runs + bowl wickets only)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{scorecardEntryMode === "quick" ? "Quick mode keeps existing full flow and lets you enter only batting runs and bowling wickets for faster admin updates." : "Detailed mode includes full batting and bowling scorecard fields."}</p>
          </div>
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

            <div className="relative mt-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input value={scorecardPlayerSearch} onChange={(e) => setScorecardPlayerSearch(e.target.value)} placeholder="Search players by name or ID..." className="mb-4 rounded-full pl-9" />
            </div>

            <div
              className="flex-1 overflow-y-auto pr-2 scrollbar-thin"
              style={{ maxHeight: "calc(90vh - 220px)" }}
            >
              <TabsContent value="teamA" className="space-y-4 mt-0">
                <div className="border rounded-lg p-3">
                  <Label className="text-sm font-semibold mb-2 block">
                    Select players for {scorecardMatch?.team_a}:
                  </Label>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">Same player can appear in both teams</p>
                    <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => applyRecentLineup("A")}>
                      <Sparkles className="mr-1 h-3.5 w-3.5" /> Apply recent lineup
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {filteredPlayers.map((p) => (
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
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">Same player can appear in both teams</p>
                    <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => applyRecentLineup("B")}>
                      <Sparkles className="mr-1 h-3.5 w-3.5" /> Apply recent lineup
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {filteredPlayers.map((p) => (
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

          <div className="flex items-center justify-between gap-2 pt-4 border-t mt-2">
            {/* Auto-calculated score preview */}
            {scorecardMatch && (
              <div className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-xs text-muted-foreground space-y-1">
                <p>{scorecardMatch.team_a}: {(() => {
                  const rows = performances.filter(p => p.team === scorecardMatch.team_a && p.did_bat);
                  const runs = rows.reduce((s, r) => s + r.bat_runs, 0);
                  const wkts = rows.filter(r => r.bat_how_out && r.bat_how_out !== "not out").length;
                  const balls = rows.reduce((s, r) => s + r.bat_balls, 0);
                  const ov = Math.floor(balls / 6) + (balls % 6) / 10;
                  return `${runs}/${wkts} (${ov.toFixed(1)})`;
                })()}</p>
                <p>{scorecardMatch.team_b}: {(() => {
                  const rows = performances.filter(p => p.team === scorecardMatch.team_b && p.did_bat);
                  const runs = rows.reduce((s, r) => s + r.bat_runs, 0);
                  const wkts = rows.filter(r => r.bat_how_out && r.bat_how_out !== "not out").length;
                  const balls = rows.reduce((s, r) => s + r.bat_balls, 0);
                  const ov = Math.floor(balls / 6) + (balls % 6) / 10;
                  return `${runs}/${wkts} (${ov.toFixed(1)})`;
                })()}</p>
              </div>
            )}
            <div className="flex gap-2 items-center">
              {isSavingScorecard && (
                <div className="space-y-1">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${savingProgress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Elapsed: {saveElapsedSeconds}s · Est left: {Math.max(0, Math.ceil((100 - savingProgress) / 8) * 0.2).toFixed(1)}s
                  </p>
                </div>
              )}
              {saveSuccess && (
                <span className="text-primary font-semibold text-sm animate-pulse">✅ Saved!</span>
              )}
              <Button variant="outline" onClick={() => setScorecardOpen(false)} disabled={isSavingScorecard}>
                Cancel
              </Button>
              <Button onClick={saveScorecard} disabled={isSavingScorecard}>
                {isSavingScorecard ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving {savingProgress}%...
                  </>
                ) : (
                  "💾 Save All Scorecard"
                )}
              </Button>
            </div>
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
          <CardContent className="space-y-4 p-4 md:p-6">
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

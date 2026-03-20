import { useState, useMemo, useEffect } from 'react';
import { useData } from '@/lib/DataContext';
import { useAuth } from '@/lib/auth';
import { v2api, istNow, logAudit } from '@/lib/v2api';
import { MatchTimeline } from '@/lib/v2types';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import { Loader2, Undo2, Redo2, Play, StopCircle, RotateCcw, Trophy, Save } from 'lucide-react';
import { generateId } from '@/lib/utils';
import { BattingScorecard, BowlingScorecard } from '@/lib/types';

interface ScoringAction {
  id: string;
  type: 'runs' | 'wicket' | 'extra' | 'ball';
  runs?: number;
  wicketType?: string;
  batsmanId?: string;
  bowlerId?: string;
  team: string;
  over: string;
  description: string;
  timestamp: string;
}


function advanceOver(value: string) {
  const [oversText, ballsText] = value.split('.');
  let overs = Number(oversText || 0);
  let balls = Number(ballsText || 0);
  if (Number.isNaN(overs) || Number.isNaN(balls)) return value;
  balls += 1;
  if (balls >= 6) {
    overs += 1;
    balls = 0;
  }
  return `${overs}.${balls}`;
}

const MatchCenter = () => {
  const { isAdmin } = useAuth();
  const { user } = useAuth();
  const { matches, batting, bowling, players, tournaments, seasons, updateMatch, saveScorecardBulk } = useData();
  const { toast } = useToast();

  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [timeline, setTimeline] = useState<MatchTimeline[]>([]);
  const [scoringHistory, setScoringHistory] = useState<ScoringAction[]>([]);
  const [undoneActions, setUndoneActions] = useState<ScoringAction[]>([]);
  const [currentOver, setCurrentOver] = useState('0.0');
  const [currentBatsman, setCurrentBatsman] = useState('');
  const [currentBowler, setCurrentBowler] = useState('');
  const [battingTeam, setBattingTeam] = useState<'A' | 'B'>('A');
  const [innings, setInnings] = useState(1);
  const [loading, setLoading] = useState(false);
  const [quickNote, setQuickNote] = useState('');
  
  // Local live batting/bowling state that updates in real-time
  const [liveBatting, setLiveBatting] = useState<BattingScorecard[]>([]);
  const [liveBowling, setLiveBowling] = useState<BowlingScorecard[]>([]);

  if (!isAdmin) return <Navigate to="/login" />;

  const match = matches.find(m => m.match_id === selectedMatchId);
  const tournament = match ? tournaments.find(t => t.tournament_id === match.tournament_id) : null;
  const season = match ? seasons.find(s => s.season_id === match.season_id) : null;

  // Initialize live data when match is selected
  useEffect(() => {
    if (selectedMatchId) {
      setLiveBatting(batting.filter(b => b.match_id === selectedMatchId));
      setLiveBowling(bowling.filter(b => b.match_id === selectedMatchId));
    }
  }, [selectedMatchId, batting, bowling]);

  const calcTeamScore = (team: string) => {
    const rows = liveBatting.filter(b => b.team === team);
    const runs = rows.reduce((s, b) => s + b.runs, 0);
    const wkts = rows.filter(b => b.how_out && b.how_out !== 'not out' && b.how_out !== '').length;
    const balls = rows.reduce((s, b) => s + b.balls, 0);
    const overs = Math.floor(balls / 6) + (balls % 6) / 10;
    return { runs, wkts, overs: overs.toFixed(1), balls };
  };

  const teamAScore = match ? calcTeamScore(match.team_a) : { runs: 0, wkts: 0, overs: '0.0', balls: 0 };
  const teamBScore = match ? calcTeamScore(match.team_b) : { runs: 0, wkts: 0, overs: '0.0', balls: 0 };

  const runRate = (runs: number, balls: number) => balls > 0 ? ((runs / balls) * 6).toFixed(2) : '0.00';
  const isLiveMatch = match?.status === 'live';
  const battingTeamName = match ? (battingTeam === 'A' ? match.team_a : match.team_b) : '';
  const bowlingTeamName = match ? (battingTeam === 'A' ? match.team_b : match.team_a) : '';
  const battingOptions = useMemo(() => players.filter((player) => !battingTeamName || liveBatting.some((entry) => entry.team === battingTeamName && entry.player_id === player.player_id) || liveBowling.some((entry) => entry.team === battingTeamName && entry.player_id === player.player_id)), [players, battingTeamName, liveBatting, liveBowling]);
  const bowlingOptions = useMemo(() => players.filter((player) => !bowlingTeamName || liveBatting.some((entry) => entry.team === bowlingTeamName && entry.player_id === player.player_id) || liveBowling.some((entry) => entry.team === bowlingTeamName && entry.player_id === player.player_id)), [players, bowlingTeamName, liveBatting, liveBowling]);

  const addTimelineEvent = async (eventType: string, description: string, playerId: string = '') => {
    if (!match) return;
    const evt: MatchTimeline = {
      event_id: generateId('TL'),
      match_id: match.match_id,
      over: currentOver,
      event_type: eventType,
      description,
      player_id: playerId,
      team: battingTeam === 'A' ? match.team_a : match.team_b,
      timestamp: istNow(),
    };
    await v2api.addTimelineEvent(evt);
    setTimeline(prev => [evt, ...prev]);
  };

  const addScoringAction = (action: ScoringAction) => {
    setScoringHistory(prev => [...prev, action]);
    setUndoneActions([]);
  };

  // Helper to ensure a batting entry exists for a player
  const ensureBattingEntry = (playerId: string, team: string): BattingScorecard => {
    const existing = liveBatting.find(b => b.player_id === playerId && b.team === team);
    if (existing) return existing;
    const entry: BattingScorecard = {
      id: `${selectedMatchId}_BAT_${playerId}_${team}`,
      match_id: selectedMatchId,
      player_id: playerId,
      team,
      runs: 0, balls: 0, fours: 0, sixes: 0, strike_rate: 0, how_out: '', bowler_id: '',
    };
    setLiveBatting(prev => [...prev, entry]);
    return entry;
  };

  const ensureBowlingEntry = (playerId: string, team: string): BowlingScorecard => {
    const existing = liveBowling.find(b => b.player_id === playerId && b.team === team);
    if (existing) return existing;
    const entry: BowlingScorecard = {
      id: `${selectedMatchId}_BOWL_${playerId}_${team}`,
      match_id: selectedMatchId,
      player_id: playerId,
      team,
      overs: 0, maidens: 0, runs_conceded: 0, wickets: 0, economy: 0, extras: 0,
    };
    setLiveBowling(prev => [...prev, entry]);
    return entry;
  };

  const handleScoreRuns = async (runs: number) => {
    if (!match || !currentBatsman) {
      toast({ title: 'Select a batsman first', variant: 'destructive' });
      return;
    }
    const team = battingTeam === 'A' ? match.team_a : match.team_b;
    const bowlerTeam = battingTeam === 'A' ? match.team_b : match.team_a;
    
    // Update live batting data
    ensureBattingEntry(currentBatsman, team);
    setLiveBatting(prev => prev.map(b => {
      if (b.player_id === currentBatsman && b.team === team) {
        const newRuns = b.runs + runs;
        const newBalls = b.balls + 1;
        const newFours = b.fours + (runs === 4 ? 1 : 0);
        const newSixes = b.sixes + (runs === 6 ? 1 : 0);
        return { ...b, runs: newRuns, balls: newBalls, fours: newFours, sixes: newSixes, strike_rate: newBalls > 0 ? (newRuns / newBalls) * 100 : 0 };
      }
      return b;
    }));

    // Update live bowling data
    if (currentBowler) {
      ensureBowlingEntry(currentBowler, bowlerTeam);
      setLiveBowling(prev => prev.map(b => {
        if (b.player_id === currentBowler && b.team === bowlerTeam) {
          const newRuns = b.runs_conceded + runs;
          return { ...b, runs_conceded: newRuns };
        }
        return b;
      }));
    }

    const desc = runs === 4 ? '🟢 FOUR!' : runs === 6 ? '🔴 SIX!' : `${runs} run${runs !== 1 ? 's' : ''}`;
    const action: ScoringAction = {
      id: generateId('SC'), type: 'runs', runs, team, over: currentOver,
      description: desc, batsmanId: currentBatsman, bowlerId: currentBowler, timestamp: istNow(),
    };
    addScoringAction(action);
    await addTimelineEvent(runs === 4 ? 'FOUR' : runs === 6 ? 'SIX' : 'RUNS', `Over ${currentOver} – ${desc}`, currentBatsman);
    logAudit(user?.username || 'admin', 'score_runs', 'match', match.match_id, JSON.stringify({ over: currentOver, runs, batsmanId: currentBatsman, bowlerId: currentBowler, team }));
    setCurrentOver((prev) => advanceOver(prev));
    toast({ title: desc, description: `Over ${currentOver}` });
  };

  const handleWicket = async (wicketType: string) => {
    if (!match || !currentBatsman) {
      toast({ title: 'Select a batsman first', variant: 'destructive' });
      return;
    }
    const team = battingTeam === 'A' ? match.team_a : match.team_b;
    const bowlerTeam = battingTeam === 'A' ? match.team_b : match.team_a;

    // Update batsman dismissal
    ensureBattingEntry(currentBatsman, team);
    setLiveBatting(prev => prev.map(b => {
      if (b.player_id === currentBatsman && b.team === team) {
        return { ...b, how_out: wicketType, bowler_id: currentBowler, balls: b.balls + 1 };
      }
      return b;
    }));

    // Update bowler wickets
    if (currentBowler) {
      ensureBowlingEntry(currentBowler, bowlerTeam);
      setLiveBowling(prev => prev.map(b => {
        if (b.player_id === currentBowler && b.team === bowlerTeam) {
          return { ...b, wickets: b.wickets + 1 };
        }
        return b;
      }));
    }

    const desc = `💀 WICKET! ${wicketType}`;
    const action: ScoringAction = {
      id: generateId('SC'), type: 'wicket', wicketType, team, over: currentOver,
      description: desc, batsmanId: currentBatsman, bowlerId: currentBowler, timestamp: istNow(),
    };
    addScoringAction(action);
    await addTimelineEvent('WICKET', `Over ${currentOver} – ${desc}`, currentBatsman);
    logAudit(user?.username || 'admin', 'record_wicket', 'match', match.match_id, JSON.stringify({ over: currentOver, wicketType, batsmanId: currentBatsman, bowlerId: currentBowler, team }));
    setCurrentOver((prev) => advanceOver(prev));
    setCurrentBatsman('');
    toast({ title: 'Wicket!', description: `${wicketType} - Over ${currentOver}`, variant: 'destructive' });
  };

  const handleAddNote = async () => {
    if (!quickNote.trim()) return;
    await addTimelineEvent('NOTE', `📝 ${quickNote.trim()}`);
    logAudit(user?.username || 'admin', 'add_live_note', 'match', selectedMatchId, quickNote.trim());
    toast({ title: 'Note added to timeline' });
    setQuickNote('');
  };

  const handleExtra = async (type: string, runs: number) => {
    if (!match) return;
    const bowlerTeam = battingTeam === 'A' ? match.team_b : match.team_a;
    
    // Add extras to bowler
    if (currentBowler) {
      ensureBowlingEntry(currentBowler, bowlerTeam);
      setLiveBowling(prev => prev.map(b => {
        if (b.player_id === currentBowler && b.team === bowlerTeam) {
          return { ...b, extras: b.extras + runs, runs_conceded: b.runs_conceded + runs };
        }
        return b;
      }));
    }

    const desc = `${type} +${runs}`;
    const action: ScoringAction = {
      id: generateId('SC'), type: 'extra', runs,
      team: battingTeam === 'A' ? match.team_a : match.team_b,
      over: currentOver, description: desc, timestamp: istNow(),
    };
    addScoringAction(action);
    await addTimelineEvent('EXTRA', `Over ${currentOver} – ${desc}`);
    logAudit(user?.username || 'admin', 'record_extra', 'match', match.match_id, JSON.stringify({ over: currentOver, extraType: type, runs, bowlerId: currentBowler }));
  };

  const undoLastAction = () => {
    if (scoringHistory.length === 0) return;
    const last = scoringHistory[scoringHistory.length - 1];
    setScoringHistory(prev => prev.slice(0, -1));
    setUndoneActions(prev => [...prev, last]);
    // Reverse the scoring action in live data
    if (last.batsmanId && match) {
      setLiveBatting(prev => prev.map(b => {
        if (b.player_id === last.batsmanId && b.team === last.team) {
          if (last.type === 'runs') {
            return { ...b, runs: b.runs - (last.runs || 0), balls: b.balls - 1, fours: b.fours - (last.runs === 4 ? 1 : 0), sixes: b.sixes - (last.runs === 6 ? 1 : 0) };
          }
          if (last.type === 'wicket') {
            return { ...b, how_out: '', bowler_id: '', balls: b.balls - 1 };
          }
        }
        return b;
      }));
    }
    toast({ title: 'Undone', description: last.description });
  };

  const redoLastAction = () => {
    if (undoneActions.length === 0) return;
    const last = undoneActions[undoneActions.length - 1];
    setUndoneActions(prev => prev.slice(0, -1));
    setScoringHistory(prev => [...prev, last]);
    toast({ title: 'Redone', description: last.description });
  };

  // Save live scoring data to backend
  const handleSaveScoring = async () => {
    if (!match) return;
    setLoading(true);
    try {
      const aScore = calcTeamScore(match.team_a);
      const bScore = calcTeamScore(match.team_b);
      await saveScorecardBulk(selectedMatchId, liveBatting, liveBowling);
      await updateMatch({
        ...match,
        team_a_score: `${aScore.runs}/${aScore.wkts} (${aScore.overs})`,
        team_b_score: `${bScore.runs}/${bScore.wkts} (${bScore.overs})`,
      });
      logAudit(user?.username || 'admin', 'save_live_scoring', 'match', match.match_id, JSON.stringify({ teamAScore: aScore, teamBScore: bScore, actions: scoringHistory.length }));
      toast({ title: '✅ Scoring data saved to database!' });
    } catch (e) {
      toast({ title: 'Error saving', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleStartMatch = async () => {
    if (!match) return;
    await updateMatch({ ...match, status: 'live' });
    await addTimelineEvent('MATCH_START', 'Match Started');
    logAudit(user?.username || 'admin', 'start_match', 'match', match.match_id);
    toast({ title: '🏏 Match Started!' });
  };

  const handleEndInnings = async () => {
    if (!match) return;
    // Save current innings data
    await handleSaveScoring();
    await addTimelineEvent('INNINGS_END', `Innings ${innings} ended`);
    setInnings(2);
    setBattingTeam(battingTeam === 'A' ? 'B' : 'A');
    setCurrentOver('0.0');
    setCurrentBatsman('');
    setCurrentBowler('');
    logAudit(user?.username || 'admin', 'end_innings', 'match', match.match_id, JSON.stringify({ completedInnings: innings }));
    toast({ title: `Innings ${innings} ended` });
  };

  const handleFinishMatch = async () => {
    if (!match) return;
    const aScore = calcTeamScore(match.team_a);
    const bScore = calcTeamScore(match.team_b);
    
    let result = '';
    if (aScore.runs > bScore.runs) {
      result = `${match.team_a} won by ${aScore.runs - bScore.runs} runs`;
    } else if (bScore.runs > aScore.runs) {
      result = `${match.team_b} won by ${10 - bScore.wkts} wickets`;
    } else {
      result = 'Match Tied';
    }

    // Save scoring data first
    await saveScorecardBulk(selectedMatchId, liveBatting, liveBowling);

    await updateMatch({
      ...match,
      status: 'completed',
      result,
      team_a_score: `${aScore.runs}/${aScore.wkts} (${aScore.overs})`,
      team_b_score: `${bScore.runs}/${bScore.wkts} (${bScore.overs})`,
    });
    await addTimelineEvent('MATCH_END', `Match Finished - ${result}`);
    logAudit(user?.username || 'admin', 'finish_match', 'match', match.match_id, result);
    toast({ title: '🏆 Match Finished!', description: result });
  };

  const loadTimeline = async (matchId: string) => {
    setLoading(true);
    const allTimeline = await v2api.getMatchTimeline();
    setTimeline(allTimeline.filter(t => t.match_id === matchId).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ));
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 space-y-6">
        <h1 className="font-display text-3xl font-bold">🏏 Match Center – Live Scoring</h1>

        {/* Match Selection */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label>Select Match</Label>
                <Select value={selectedMatchId} onValueChange={(v) => { setSelectedMatchId(v); loadTimeline(v); setScoringHistory([]); setUndoneActions([]); }}>
                  <SelectTrigger><SelectValue placeholder="Choose a match..." /></SelectTrigger>
                  <SelectContent>
                    {matches.map(m => {
                      const t = tournaments.find(t => t.tournament_id === m.tournament_id);
                      const s = seasons.find(s => s.season_id === m.season_id);
                      return (
                        <SelectItem key={m.match_id} value={m.match_id}>
                          {m.team_a} vs {m.team_b} • {t?.name} {s?.year} {m.match_stage ? `• ${m.match_stage}` : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {match && (
          <>
            {/* Live Scoreboard */}
            <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {tournament && <Badge variant="outline" className="text-xs">{tournament.name}</Badge>}
                    {season && <Badge variant="outline" className="text-xs">{season.year}</Badge>}
                    {match.match_stage && (
                      <Badge className="bg-accent text-accent-foreground text-xs">{match.match_stage}</Badge>
                    )}
                  </div>
                  <Badge className={match.status === 'live' ? 'bg-destructive text-destructive-foreground animate-pulse' : 'bg-primary text-primary-foreground'}>
                    {match.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 my-6">
                  <div className={`text-center p-4 rounded-lg ${battingTeam === 'A' ? 'bg-primary/10 ring-2 ring-primary/30' : 'bg-muted/50'}`}>
                    <p className="font-display text-lg font-bold">{match.team_a}</p>
                    <p className="text-3xl font-bold text-primary">{teamAScore.runs}/{teamAScore.wkts}</p>
                    <p className="text-sm text-muted-foreground">({teamAScore.overs} ov)</p>
                    <p className="text-xs text-muted-foreground">RR: {runRate(teamAScore.runs, teamAScore.balls)}</p>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-2xl font-display font-bold text-muted-foreground">VS</span>
                      {innings === 2 && teamAScore.runs > 0 && (
                        <p className="text-xs text-accent font-semibold mt-1">
                          Target: {teamAScore.runs + 1}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className={`text-center p-4 rounded-lg ${battingTeam === 'B' ? 'bg-primary/10 ring-2 ring-primary/30' : 'bg-muted/50'}`}>
                    <p className="font-display text-lg font-bold">{match.team_b}</p>
                    <p className="text-3xl font-bold text-primary">{teamBScore.runs}/{teamBScore.wkts}</p>
                    <p className="text-sm text-muted-foreground">({teamBScore.overs} ov)</p>
                    <p className="text-xs text-muted-foreground">RR: {runRate(teamBScore.runs, teamBScore.balls)}</p>
                  </div>
                </div>

                {/* Match Controls */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {match.status === 'scheduled' && (
                    <Button onClick={handleStartMatch} className="gap-1">
                      <Play className="h-4 w-4" /> Start Match
                    </Button>
                  )}
                  {match.status === 'live' && (
                    <>
                      <Button variant="secondary" onClick={handleSaveScoring} disabled={loading} className="gap-1 rounded-full">
                        <Save className="h-4 w-4" /> Save Scores
                      </Button>
                      <Button variant="outline" onClick={handleEndInnings} className="gap-1 rounded-full">
                        <RotateCcw className="h-4 w-4" /> End Innings
                      </Button>
                      <Button variant="destructive" onClick={handleFinishMatch} className="gap-1 rounded-full">
                        <StopCircle className="h-4 w-4" /> Finish Match
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <>
                {/* Scoring Controls */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Run Buttons */}
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-display">⚡ Score Runs</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Label className="text-xs">Current Over</Label>
                          <Input value={currentOver} onChange={e => setCurrentOver(e.target.value)} placeholder="0.0" className="h-8" disabled={!isLiveMatch} />
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs">Batting Team</Label>
                          <Select value={battingTeam} onValueChange={v => setBattingTeam(v as 'A' | 'B')} disabled={!isLiveMatch}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A">{match.team_a}</SelectItem>
                              <SelectItem value="B">{match.team_b}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Label className="text-xs">Batsman</Label>
                          <Select value={currentBatsman} onValueChange={setCurrentBatsman} disabled={!isLiveMatch}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {(battingOptions.length > 0 ? battingOptions : players).map(p => <SelectItem key={p.player_id} value={p.player_id}>{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs">Bowler</Label>
                          <Select value={currentBowler} onValueChange={setCurrentBowler} disabled={!isLiveMatch}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {(bowlingOptions.length > 0 ? bowlingOptions : players).map(p => <SelectItem key={p.player_id} value={p.player_id}>{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-primary/10 bg-primary/5 p-3 text-xs text-muted-foreground">
                        <p className="font-semibold text-foreground">Smart helpers</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline" className="rounded-full">Innings {innings}</Badge>
                          <Badge variant="outline" className="rounded-full">Batting: {battingTeamName || '-'}</Badge>
                          <Badge variant="outline" className="rounded-full">Bowling: {bowlingTeamName || '-'}</Badge>
                          {currentBatsman && <Badge className="rounded-full bg-primary/15 text-primary">Striker selected</Badge>}
                          {currentBowler && <Badge className="rounded-full bg-accent/15 text-foreground">Bowler selected</Badge>}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {[0, 1, 2, 3, 4, 6].map(r => (
                          <Button key={r} variant={r === 4 ? 'default' : r === 6 ? 'destructive' : 'outline'} size="sm" onClick={() => handleScoreRuns(r)} className="font-bold text-lg h-12" disabled={!isLiveMatch}>
                            {r}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Wicket & Extras */}
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-display">💀 Wickets & Extras</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <Label className="text-xs font-semibold">Wicket Type</Label>
                      <div className="grid grid-cols-2 gap-1">
                        {['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Hit Wicket'].map(w => (
                          <Button key={w} variant="outline" size="sm" onClick={() => handleWicket(w)} className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10" disabled={!isLiveMatch}>
                            {w}
                          </Button>
                        ))}
                      </div>
                      <Label className="text-xs font-semibold">Extras</Label>
                      <div className="grid grid-cols-3 gap-1">
                        {[['Wide', 1], ['No Ball', 1], ['Bye', 1], ['Leg Bye', 1], ['Penalty', 5]].map(([type, runs]) => (
                          <Button key={type as string} variant="secondary" size="sm" onClick={() => handleExtra(type as string, runs as number)} className="text-xs" disabled={!isLiveMatch}>
                            {type as string} +{runs as number}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Undo/Redo + Timeline */}
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-display">🔄 Controls</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={undoLastAction} disabled={!isLiveMatch || scoringHistory.length === 0} className="flex-1 gap-1">
                          <Undo2 className="h-4 w-4" /> Undo
                        </Button>
                        <Button variant="outline" size="sm" onClick={redoLastAction} disabled={!isLiveMatch || undoneActions.length === 0} className="flex-1 gap-1">
                          <Redo2 className="h-4 w-4" /> Redo
                        </Button>
                      </div>
                      
                      <div className="border-t pt-2 space-y-2">
                        <Label className="text-xs font-semibold">Live Note</Label>
                        <div className="flex gap-2">
                          <Input value={quickNote} onChange={e => setQuickNote(e.target.value)} placeholder="Add umpire note..." className="h-8 text-xs" disabled={!isLiveMatch} />
                          <Button size="sm" variant="secondary" onClick={handleAddNote} disabled={!isLiveMatch}>Add</Button>
                        </div>
                      </div>

                      <div className="border-t pt-2">
                        <Label className="text-xs font-semibold mb-2 block">Recent Actions</Label>
                        <div className="max-h-[200px] overflow-y-auto space-y-1 scrollbar-thin">
                          {scoringHistory.slice().reverse().slice(0, 15).map(a => (
                            <div key={a.id} className="text-xs p-1.5 rounded bg-muted/50 flex items-center justify-between">
                              <span>{a.description}</span>
                              <span className="text-muted-foreground">{a.over}</span>
                            </div>
                          ))}
                          {scoringHistory.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No actions yet</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Man of the Match Selection */}
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Trophy className="h-5 w-5 text-accent" />
                    <Label className="font-semibold">Man of the Match:</Label>
                    <Select value={match.man_of_match || ''} onValueChange={async v => {
                      await updateMatch({ ...match, man_of_match: v });
                      toast({ title: 'Man of the Match updated' });
                    }}>
                      <SelectTrigger className="w-48"><SelectValue placeholder="Select MOM" /></SelectTrigger>
                      <SelectContent>
                        {players.map(p => <SelectItem key={p.player_id} value={p.player_id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              </>

            {/* Match Timeline */}
            <Card>
              <CardHeader><CardTitle className="font-display">📋 Match Timeline</CardTitle></CardHeader>
              <CardContent>
                {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : (
                  <div className="max-h-[400px] overflow-y-auto space-y-2 scrollbar-thin">
                    {timeline.map(evt => (
                      <div key={evt.event_id} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 border-l-2 border-primary/30">
                        <Badge variant="outline" className="text-xs shrink-0 mt-0.5">
                          {evt.over}
                        </Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{evt.description}</p>
                          <p className="text-xs text-muted-foreground">{evt.team} • {evt.timestamp}</p>
                        </div>
                        <Badge className={`text-xs ${
                          evt.event_type === 'WICKET' ? 'bg-destructive text-destructive-foreground' :
                          evt.event_type === 'FOUR' ? 'bg-primary text-primary-foreground' :
                          evt.event_type === 'SIX' ? 'bg-accent text-accent-foreground' :
                          'bg-muted text-muted-foreground'
                        }`}>{evt.event_type}</Badge>
                      </div>
                    ))}
                    {timeline.length === 0 && <p className="text-muted-foreground text-center py-4">No timeline events yet</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default MatchCenter;

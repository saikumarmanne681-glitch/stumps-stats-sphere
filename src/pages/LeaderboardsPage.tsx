import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { useData } from '@/lib/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Target, TrendingUp, Medal } from 'lucide-react';
import { calcBattingStats, calcBowlingStats, getPlayerMatchCounts } from '@/lib/calculations';

const LeaderboardsPage = () => {
  const { matches, batting, bowling, players, tournaments, seasons } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterTournament = searchParams.get('tournament') || 'all';
  const filterSeason = searchParams.get('season') || 'all';

  const relevantSeasons = filterTournament === 'all' ? seasons : seasons.filter(s => s.tournament_id === filterTournament);
  
  const filteredMatches = useMemo(() => {
    let m = matches;
    if (filterTournament !== 'all') m = m.filter(x => x.tournament_id === filterTournament);
    if (filterSeason !== 'all') m = m.filter(x => x.season_id === filterSeason);
    return m;
  }, [matches, filterTournament, filterSeason]);

  const matchIds = useMemo(() => new Set(filteredMatches.map(m => m.match_id)), [filteredMatches]);
  const fBat = useMemo(() => batting.filter(b => matchIds.has(b.match_id)), [batting, matchIds]);
  const fBowl = useMemo(() => bowling.filter(b => matchIds.has(b.match_id)), [bowling, matchIds]);

  // Team Standings
  const teamStandings = useMemo(() => {
    const teams: Record<string, { played: number; won: number; lost: number; tied: number; points: number; runsFor: number; ballsFaced: number; runsAgainst: number; ballsBowled: number }> = {};
    
    filteredMatches.filter(m => m.status === 'completed').forEach(m => {
      [m.team_a, m.team_b].forEach(team => {
        if (!teams[team]) teams[team] = { played: 0, won: 0, lost: 0, tied: 0, points: 0, runsFor: 0, ballsFaced: 0, runsAgainst: 0, ballsBowled: 0 };
      });
      
      teams[m.team_a].played++;
      teams[m.team_b].played++;
      
      const parseScore = (score: string) => {
        const match = score.match(/(\d+)\/(\d+)/);
        return match ? { runs: parseInt(match[1]), wickets: parseInt(match[2]) } : { runs: 0, wickets: 0 };
      };
      
      const aScore = parseScore(m.team_a_score || '0/0');
      const bScore = parseScore(m.team_b_score || '0/0');
      
      const aBalls = fBat.filter(b => b.match_id === m.match_id && b.team === m.team_a).reduce((s, b) => s + b.balls, 0) || 1;
      const bBalls = fBat.filter(b => b.match_id === m.match_id && b.team === m.team_b).reduce((s, b) => s + b.balls, 0) || 1;
      
      teams[m.team_a].runsFor += aScore.runs;
      teams[m.team_a].ballsFaced += aBalls;
      teams[m.team_a].runsAgainst += bScore.runs;
      teams[m.team_a].ballsBowled += bBalls;
      
      teams[m.team_b].runsFor += bScore.runs;
      teams[m.team_b].ballsFaced += bBalls;
      teams[m.team_b].runsAgainst += aScore.runs;
      teams[m.team_b].ballsBowled += aBalls;
      
      if (aScore.runs > bScore.runs) {
        teams[m.team_a].won++; teams[m.team_a].points += 2;
        teams[m.team_b].lost++;
      } else if (bScore.runs > aScore.runs) {
        teams[m.team_b].won++; teams[m.team_b].points += 2;
        teams[m.team_a].lost++;
      } else {
        teams[m.team_a].tied++; teams[m.team_a].points += 1;
        teams[m.team_b].tied++; teams[m.team_b].points += 1;
      }
    });
    
    return Object.entries(teams).map(([team, data]) => {
      const nrr = (data.ballsFaced > 0 && data.ballsBowled > 0) 
        ? ((data.runsFor / data.ballsFaced) * 6 - (data.runsAgainst / data.ballsBowled) * 6)
        : 0;
      return { team, ...data, nrr };
    }).sort((a, b) => b.points - a.points || b.nrr - a.nrr);
  }, [filteredMatches, fBat]);

  // Player batting leaderboard
  const battingLeaderboard = useMemo(() => {
    const playerMap: Record<string, typeof fBat> = {};
    fBat.forEach(b => {
      if (!playerMap[b.player_id]) playerMap[b.player_id] = [];
      playerMap[b.player_id].push(b);
    });
    return Object.entries(playerMap).map(([pid, entries]) => {
      const stats = calcBattingStats(entries);
      return { player_id: pid, ...stats };
    }).filter(s => s.totalRuns !== undefined && s.totalRuns > 0)
      .sort((a, b) => (b.totalRuns || 0) - (a.totalRuns || 0));
  }, [fBat]);

  // Player bowling leaderboard
  const bowlingLeaderboard = useMemo(() => {
    const playerMap: Record<string, typeof fBowl> = {};
    fBowl.forEach(b => {
      if (!playerMap[b.player_id]) playerMap[b.player_id] = [];
      playerMap[b.player_id].push(b);
    });
    return Object.entries(playerMap).map(([pid, entries]) => {
      const stats = calcBowlingStats(entries);
      return { player_id: pid, ...stats };
    }).filter(s => s.totalWickets !== undefined && s.totalWickets > 0)
      .sort((a, b) => (b.totalWickets || 0) - (a.totalWickets || 0));
  }, [fBowl]);

  const getPlayerName = (id: string) => players.find(p => p.player_id === id)?.name || id;

  const updateTournament = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all') next.delete('tournament');
    else next.set('tournament', value);
    next.delete('season');
    setSearchParams(next);
  };

  const updateSeason = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (filterTournament !== 'all') next.set('tournament', filterTournament);
    if (value === 'all') next.delete('season');
    else next.set('season', value);
    setSearchParams(next);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-8">
        <h1 className="font-display text-4xl font-bold">🏆 Leaderboards</h1>
        <p className="text-sm text-muted-foreground">
          Showing standings for{' '}
          <span className="font-medium text-foreground">
            {filterTournament === 'all'
              ? 'all tournaments'
              : tournaments.find((t) => t.tournament_id === filterTournament)?.name || 'selected tournament'}
          </span>
          {' '}•{' '}
          <span className="font-medium text-foreground">
            {filterSeason === 'all'
              ? 'all seasons'
              : `season ${seasons.find((s) => s.season_id === filterSeason)?.year || 'selected'}`}
          </span>
        </p>

        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Tournament</label>
            <Select value={filterTournament} onValueChange={updateTournament}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tournaments</SelectItem>
                {tournaments.map(t => <SelectItem key={t.tournament_id} value={t.tournament_id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Season</label>
            <Select value={filterSeason} onValueChange={updateSeason}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Seasons</SelectItem>
                {relevantSeasons.map(s => <SelectItem key={s.season_id} value={s.season_id}>{s.year}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="teams">
          <TabsList>
            <TabsTrigger value="teams" className="gap-1"><Trophy className="h-4 w-4" /> Team Standings</TabsTrigger>
            <TabsTrigger value="batting" className="gap-1"><TrendingUp className="h-4 w-4" /> Batting</TabsTrigger>
            <TabsTrigger value="bowling" className="gap-1"><Target className="h-4 w-4" /> Bowling</TabsTrigger>
          </TabsList>

          <TabsContent value="teams">
            <Card>
              <CardHeader><CardTitle className="font-display flex items-center gap-2"><Trophy className="h-5 w-5 text-accent" /> Points Table</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead className="text-center">P</TableHead>
                      <TableHead className="text-center">W</TableHead>
                      <TableHead className="text-center">L</TableHead>
                      <TableHead className="text-center">T</TableHead>
                      <TableHead className="text-center">Pts</TableHead>
                      <TableHead className="text-right">NRR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamStandings.map((t, i) => (
                      <TableRow key={t.team} className={i < 2 ? 'bg-primary/5' : ''}>
                        <TableCell className="font-bold">{i + 1}</TableCell>
                        <TableCell className="font-display font-semibold">{t.team}</TableCell>
                        <TableCell className="text-center">{t.played}</TableCell>
                        <TableCell className="text-center font-semibold text-primary">{t.won}</TableCell>
                        <TableCell className="text-center text-destructive">{t.lost}</TableCell>
                        <TableCell className="text-center">{t.tied}</TableCell>
                        <TableCell className="text-center font-bold text-lg">{t.points}</TableCell>
                        <TableCell className="text-right font-mono">{t.nrr >= 0 ? '+' : ''}{t.nrr.toFixed(3)}</TableCell>
                      </TableRow>
                    ))}
                    {teamStandings.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No match data</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="batting">
            <Card>
              <CardHeader><CardTitle className="font-display flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Batting Leaderboard</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-right">Inn</TableHead>
                      <TableHead className="text-right">Runs</TableHead>
                      <TableHead className="text-right">Avg</TableHead>
                      <TableHead className="text-right">SR</TableHead>
                      <TableHead className="text-right">HS</TableHead>
                      <TableHead className="text-right">4s</TableHead>
                      <TableHead className="text-right">6s</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {battingLeaderboard.map((s, i) => (
                      <TableRow key={s.player_id}>
                        <TableCell>{i === 0 ? <Medal className="h-5 w-5 text-accent" /> : i + 1}</TableCell>
                        <TableCell className="font-medium">{getPlayerName(s.player_id)}</TableCell>
                        <TableCell className="text-right">{s.innings}</TableCell>
                        <TableCell className="text-right font-bold text-primary">{s.totalRuns}</TableCell>
                        <TableCell className="text-right">{s.avg?.toFixed(1)}</TableCell>
                        <TableCell className="text-right">{s.sr?.toFixed(1)}</TableCell>
                        <TableCell className="text-right">{s.highest}</TableCell>
                        <TableCell className="text-right">{s.totalFours}</TableCell>
                        <TableCell className="text-right">{s.totalSixes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bowling">
            <Card>
              <CardHeader><CardTitle className="font-display flex items-center gap-2"><Target className="h-5 w-5 text-destructive" /> Bowling Leaderboard</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-right">Inn</TableHead>
                      <TableHead className="text-right">Overs</TableHead>
                      <TableHead className="text-right">Wkts</TableHead>
                      <TableHead className="text-right">Eco</TableHead>
                      <TableHead className="text-right">Avg</TableHead>
                      <TableHead className="text-right">Best</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bowlingLeaderboard.map((s, i) => (
                      <TableRow key={s.player_id}>
                        <TableCell>{i === 0 ? <Medal className="h-5 w-5 text-destructive" /> : i + 1}</TableCell>
                        <TableCell className="font-medium">{getPlayerName(s.player_id)}</TableCell>
                        <TableCell className="text-right">{s.innings}</TableCell>
                        <TableCell className="text-right">{s.totalOvers}</TableCell>
                        <TableCell className="text-right font-bold text-destructive">{s.totalWickets}</TableCell>
                        <TableCell className="text-right">{s.economy?.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{s.avg?.toFixed(1)}</TableCell>
                        <TableCell className="text-right">{s.bestFigures}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LeaderboardsPage;

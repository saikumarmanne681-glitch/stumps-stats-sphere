import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { useData } from '@/lib/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Trophy, Target } from 'lucide-react';
import { calcBattingStats, calcBowlingStats, getPlayerMatchCount } from '@/lib/calculations';
import { formatDateInIST } from '@/lib/time';

const PlayerPage = () => {
  const { player_id } = useParams();
  const { players, matches, batting, bowling, tournaments, seasons } = useData();
  
  const player = players.find(p => p.player_id === player_id);
  const playerBatting = batting.filter(b => b.player_id === player_id);
  const playerBowling = bowling.filter(b => b.player_id === player_id);
  const battingStats = useMemo(() => calcBattingStats(playerBatting), [playerBatting]);
  const bowlingStats = useMemo(() => calcBowlingStats(playerBowling), [playerBowling]);
  const matchCount = useMemo(() => player_id ? getPlayerMatchCount(player_id, batting, bowling) : 0, [player_id, batting, bowling]);

  const playerMatches = useMemo(() => {
    const matchIds = new Set([
      ...playerBatting.map(b => b.match_id),
      ...playerBowling.map(b => b.match_id),
    ]);
    return matches.filter(m => matchIds.has(m.match_id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [playerBatting, playerBowling, matches]);

  if (!player) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-3xl mb-4">Player Not Found</h1>
        <Button asChild><Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Button variant="ghost" size="sm" asChild><Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>

        {/* Player Info */}
        <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-10 w-10 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="font-display text-3xl font-bold">{player.name}</h1>
              <p className="text-muted-foreground capitalize">{player.role} • {player.status}</p>
            </div>
            <div className="flex gap-6 text-center">
              <div><p className="text-3xl font-bold text-primary">{matchCount}</p><p className="text-xs text-muted-foreground">Matches</p></div>
              <div><p className="text-3xl font-bold text-accent">{battingStats?.totalRuns || 0}</p><p className="text-xs text-muted-foreground">Runs</p></div>
              <div><p className="text-3xl font-bold text-destructive">{bowlingStats?.totalWickets || 0}</p><p className="text-xs text-muted-foreground">Wickets</p></div>
            </div>
          </CardContent>
        </Card>

        {/* Career Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="font-display flex items-center gap-2"><Trophy className="h-5 w-5 text-accent" /> Batting</CardTitle></CardHeader>
            <CardContent>
              {battingStats ? (
                <div className="grid grid-cols-3 gap-3">
                  {[['Innings', battingStats.innings], ['Runs', battingStats.totalRuns], ['Average', battingStats.avg.toFixed(1)],
                    ['SR', battingStats.sr.toFixed(1)], ['Highest', battingStats.highest], ['4s', battingStats.totalFours],
                    ['6s', battingStats.totalSixes], ['50s', battingStats.fifties], ['100s', battingStats.hundreds]
                  ].map(([l, v]) => (
                    <div key={String(l)} className="bg-muted rounded-lg p-3 text-center">
                      <p className="text-xl font-bold">{v}</p>
                      <p className="text-xs text-muted-foreground">{l}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted-foreground">No data</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-display flex items-center gap-2"><Target className="h-5 w-5 text-destructive" /> Bowling</CardTitle></CardHeader>
            <CardContent>
              {bowlingStats ? (
                <div className="grid grid-cols-3 gap-3">
                  {[['Innings', bowlingStats.innings], ['Overs', bowlingStats.totalOvers], ['Wickets', bowlingStats.totalWickets],
                    ['Economy', bowlingStats.economy.toFixed(2)], ['Average', bowlingStats.avg.toFixed(1)], ['Best', bowlingStats.bestFigures],
                    ['3W', bowlingStats.threeWickets], ['5W', bowlingStats.fiveWickets], ['Maidens', bowlingStats.totalMaidens]
                  ].map(([l, v]) => (
                    <div key={String(l)} className="bg-muted rounded-lg p-3 text-center">
                      <p className="text-xl font-bold">{v}</p>
                      <p className="text-xs text-muted-foreground">{l}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted-foreground">No data</p>}
            </CardContent>
          </Card>
        </div>

        {/* Recent Matches */}
        <Card>
          <CardHeader><CardTitle className="font-display">📋 Match History</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Match</TableHead><TableHead>Runs</TableHead><TableHead>Wickets</TableHead><TableHead>Result</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {playerMatches.map(m => {
                  const bat = playerBatting.find(b => b.match_id === m.match_id);
                  const bowl = playerBowling.find(b => b.match_id === m.match_id);
                  const t = tournaments.find(t => t.tournament_id === m.tournament_id);
                  return (
                    <TableRow key={m.match_id}>
                      <TableCell className="text-sm">{formatDateInIST(m.date)}</TableCell>
                      <TableCell>
                        <Link to={`/match/${m.match_id}`} className="hover:text-primary hover:underline font-medium">
                          {m.team_a} vs {m.team_b}
                        </Link>
                        {m.match_stage && <Badge variant="outline" className="ml-2 text-xs">{m.match_stage}</Badge>}
                      </TableCell>
                      <TableCell className="font-bold">{bat ? `${bat.runs}(${bat.balls})` : '-'}</TableCell>
                      <TableCell className="font-bold">{bowl ? `${bowl.wickets}/${bowl.runs_conceded}` : '-'}</TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate">{m.result || '-'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlayerPage;

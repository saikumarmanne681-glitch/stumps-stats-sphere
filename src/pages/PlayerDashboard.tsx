import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockPlayers, mockTournaments, mockSeasons, mockMatches, mockBattingScorecard, mockBowlingScorecard, mockMessages } from '@/lib/mockData';
import { calcBattingStats, calcBowlingStats, getPlayerMatchCount } from '@/lib/calculations';
import { BarChart3, MessageSquare, User, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const PlayerDashboard = () => {
  const { user, isPlayer } = useAuth();
  const { toast } = useToast();
  const [filterTournament, setFilterTournament] = useState<string>('all');
  const [filterSeason, setFilterSeason] = useState<string>('all');
  const [replyBody, setReplyBody] = useState<Record<string, string>>({});

  if (!isPlayer || !user?.player_id) return <Navigate to="/login" />;

  const player = mockPlayers.find(p => p.player_id === user.player_id);
  if (!player) return <Navigate to="/login" />;

  const relevantSeasons = filterTournament === 'all'
    ? mockSeasons
    : mockSeasons.filter(s => s.tournament_id === filterTournament);

  const relevantMatchIds = useMemo(() => {
    let matches = mockMatches;
    if (filterTournament !== 'all') matches = matches.filter(m => m.tournament_id === filterTournament);
    if (filterSeason !== 'all') matches = matches.filter(m => m.season_id === filterSeason);
    return matches.map(m => m.match_id);
  }, [filterTournament, filterSeason]);

  const playerBatting = mockBattingScorecard.filter(b => b.player_id === user.player_id && relevantMatchIds.includes(b.match_id));
  const playerBowling = mockBowlingScorecard.filter(b => b.player_id === user.player_id && relevantMatchIds.includes(b.match_id));
  const battingStats = calcBattingStats(playerBatting);
  const bowlingStats = calcBowlingStats(playerBowling);
  const totalMatches = getPlayerMatchCount(user.player_id, mockBattingScorecard, mockBowlingScorecard);

  const playerMessages = mockMessages.filter(m => m.to_id === user.player_id || m.to_id === 'all' || m.from_id === user.player_id);

  const handleReply = (msgId: string) => {
    if (!replyBody[msgId]?.trim()) return;
    toast({ title: 'Reply Sent', description: 'Your reply has been sent (mock mode).' });
    setReplyBody(prev => ({ ...prev, [msgId]: '' }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Profile Header */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="font-display text-2xl font-bold">{player.name}</h1>
              <p className="text-muted-foreground">{player.role.toUpperCase()} • {player.player_id}</p>
              <p className="text-sm text-muted-foreground">{player.phone}</p>
            </div>
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{totalMatches}</p>
                <p className="text-xs text-muted-foreground">Matches</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">{battingStats?.totalRuns || 0}</p>
                <p className="text-xs text-muted-foreground">Runs</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{bowlingStats?.totalWickets || 0}</p>
                <p className="text-xs text-muted-foreground">Wickets</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="stats">
          <TabsList>
            <TabsTrigger value="stats" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" /> Career Stats
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" /> Messages
              {playerMessages.filter(m => !m.read && m.to_id === user.player_id).length > 0 && (
                <Badge className="ml-1 bg-destructive text-destructive-foreground text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full">
                  {playerMessages.filter(m => !m.read && m.to_id === user.player_id).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-6 mt-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Tournament</label>
                <Select value={filterTournament} onValueChange={(v) => { setFilterTournament(v); setFilterSeason('all'); }}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tournaments</SelectItem>
                    {mockTournaments.map(t => (
                      <SelectItem key={t.tournament_id} value={t.tournament_id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Season</label>
                <Select value={filterSeason} onValueChange={setFilterSeason}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Seasons</SelectItem>
                    {relevantSeasons.map(s => (
                      <SelectItem key={s.season_id} value={s.season_id}>{s.year} ({s.season_id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Batting Stats */}
            <Card>
              <CardHeader><CardTitle className="font-display">🏏 Batting Statistics</CardTitle></CardHeader>
              <CardContent>
                {battingStats ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {[
                      ['Innings', battingStats.innings],
                      ['Runs', battingStats.totalRuns],
                      ['Average', battingStats.avg.toFixed(2)],
                      ['Strike Rate', battingStats.sr.toFixed(1)],
                      ['Highest', battingStats.highest],
                      ['4s', battingStats.totalFours],
                      ['6s', battingStats.totalSixes],
                      ['50s', battingStats.fifties],
                      ['100s', battingStats.hundreds],
                      ['30s', battingStats.thirties],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="bg-muted rounded-lg p-3 text-center">
                        <p className="text-xl font-bold">{value}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No batting data available.</p>
                )}
              </CardContent>
            </Card>

            {/* Bowling Stats */}
            <Card>
              <CardHeader><CardTitle className="font-display">🎯 Bowling Statistics</CardTitle></CardHeader>
              <CardContent>
                {bowlingStats ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {[
                      ['Innings', bowlingStats.innings],
                      ['Overs', bowlingStats.totalOvers],
                      ['Wickets', bowlingStats.totalWickets],
                      ['Economy', bowlingStats.economy.toFixed(2)],
                      ['Average', bowlingStats.avg.toFixed(2)],
                      ['Maidens', bowlingStats.totalMaidens],
                      ['Best', bowlingStats.bestFigures],
                      ['3W', bowlingStats.threeWickets],
                      ['5W', bowlingStats.fiveWickets],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="bg-muted rounded-lg p-3 text-center">
                        <p className="text-xl font-bold">{value}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No bowling data available.</p>
                )}
              </CardContent>
            </Card>

            {/* Match History */}
            <Card>
              <CardHeader><CardTitle className="font-display">📋 Match History</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Match</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Teams</TableHead>
                      <TableHead>Runs</TableHead>
                      <TableHead>Wickets</TableHead>
                      <TableHead>Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockMatches.filter(m => relevantMatchIds.includes(m.match_id) &&
                      (mockBattingScorecard.some(b => b.player_id === user.player_id && b.match_id === m.match_id) ||
                       mockBowlingScorecard.some(b => b.player_id === user.player_id && b.match_id === m.match_id))
                    ).map(match => {
                      const bat = mockBattingScorecard.find(b => b.player_id === user.player_id && b.match_id === match.match_id);
                      const bowl = mockBowlingScorecard.find(b => b.player_id === user.player_id && b.match_id === match.match_id);
                      return (
                        <TableRow key={match.match_id}>
                          <TableCell className="font-mono text-xs">{match.match_id}</TableCell>
                          <TableCell>{format(new Date(match.date), 'dd MMM yyyy')}</TableCell>
                          <TableCell>{match.team_a} vs {match.team_b}</TableCell>
                          <TableCell>{bat ? `${bat.runs}(${bat.balls})` : '-'}</TableCell>
                          <TableCell>{bowl ? `${bowl.wickets}/${bowl.runs_conceded}` : '-'}</TableCell>
                          <TableCell className="text-xs">{match.result || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="space-y-4 mt-4">
            <h2 className="font-display text-xl font-bold">📬 Messages</h2>
            {playerMessages.length === 0 && <p className="text-muted-foreground">No messages.</p>}
            {playerMessages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(msg => (
              <Card key={msg.id} className={`${!msg.read && msg.to_id === user.player_id ? 'border-l-4 border-l-accent' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">
                      {msg.from_id === user.player_id ? `To: ${msg.to_id}` : `From: ${msg.from_id}`}
                    </span>
                    <span className="text-xs text-muted-foreground">{format(new Date(msg.date), 'dd MMM yyyy')}</span>
                  </div>
                  <p className="font-semibold text-sm">{msg.subject}</p>
                  <p className="text-sm text-muted-foreground mt-1">{msg.body}</p>
                  {msg.from_id !== user.player_id && (
                    <div className="mt-3 flex gap-2">
                      <Input
                        placeholder="Type your reply..."
                        value={replyBody[msg.id] || ''}
                        onChange={e => setReplyBody(prev => ({ ...prev, [msg.id]: e.target.value }))}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={() => handleReply(msg.id)}>
                        <Send className="h-3 w-3 mr-1" /> Reply
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PlayerDashboard;

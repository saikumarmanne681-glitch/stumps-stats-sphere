import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useData } from '@/lib/DataContext';
import { calcBattingStats, calcBowlingStats, getPlayerMatchCount } from '@/lib/calculations';
import { generateId } from '@/lib/utils';
import { BarChart3, MessageSquare, User, Send, CheckCheck, Clock, Headphones, Mail, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { PlayerSupport } from '@/components/player/PlayerSupport';
import { PlayerEmailSettings } from '@/components/player/PlayerEmailSettings';

const PlayerDashboard = () => {
  const { user, isPlayer } = useAuth();
  const { toast } = useToast();
  const { players, tournaments, seasons, matches, batting, bowling, messages, addMessage, updateMessage } = useData();
  const [filterTournament, setFilterTournament] = useState<string>('all');
  const [filterSeason, setFilterSeason] = useState<string>('all');
  const [replyBody, setReplyBody] = useState<Record<string, string>>({});
  const [expandedThread, setExpandedThread] = useState<string>('');

  const player = useMemo(() => {
    if (!user?.player_id) return null;
    return players.find(p => p.player_id === user.player_id) || null;
  }, [user?.player_id, players]);

  const relevantSeasons = filterTournament === 'all'
    ? seasons
    : seasons.filter(s => s.tournament_id === filterTournament);

  const relevantMatchIds = useMemo(() => {
    let m = matches;
    if (filterTournament !== 'all') m = m.filter(x => x.tournament_id === filterTournament);
    if (filterSeason !== 'all') m = m.filter(x => x.season_id === filterSeason);
    return m.map(x => x.match_id);
  }, [filterTournament, filterSeason, matches]);

  const playerBatting = useMemo(() => user?.player_id ? batting.filter(b => b.player_id === user.player_id && relevantMatchIds.includes(b.match_id)) : [], [user?.player_id, relevantMatchIds, batting]);
  const playerBowling = useMemo(() => user?.player_id ? bowling.filter(b => b.player_id === user.player_id && relevantMatchIds.includes(b.match_id)) : [], [user?.player_id, relevantMatchIds, bowling]);
  const battingStats = useMemo(() => calcBattingStats(playerBatting), [playerBatting]);
  const bowlingStats = useMemo(() => calcBowlingStats(playerBowling), [playerBowling]);
  const totalMatches = useMemo(() => user?.player_id ? getPlayerMatchCount(user.player_id, batting, bowling) : 0, [user?.player_id, batting, bowling]);

  const playerMessages = useMemo(() => user?.player_id ? messages.filter(m => m.to_id === user.player_id || m.to_id === 'all' || m.from_id === user.player_id) : [], [user?.player_id, messages]);

  const threads = useMemo(() => {
    const threadMap = new Map<string, typeof playerMessages>();
    const roots = playerMessages.filter(m => !m.reply_to);
    roots.forEach(root => {
      const thread = [root];
      const findReplies = (parentId: string) => {
        const replies = playerMessages.filter(m => m.reply_to === parentId);
        replies.forEach(r => { thread.push(r); findReplies(r.id); });
      };
      findReplies(root.id);
      thread.sort((a, b) => new Date(a.timestamp || a.date).getTime() - new Date(b.timestamp || b.date).getTime());
      threadMap.set(root.id, thread);
    });
    playerMessages.filter(m => m.reply_to && !playerMessages.find(p => p.id === m.reply_to)).forEach(m => {
      threadMap.set(m.id, [m]);
    });
    return Array.from(threadMap.entries())
      .sort(([, a], [, b]) => new Date(b[b.length - 1].timestamp || b[b.length - 1].date).getTime() - new Date(a[a.length - 1].timestamp || a[a.length - 1].date).getTime());
  }, [playerMessages]);

  if (!isPlayer || !user?.player_id || !player) return <Navigate to="/login" />;

  const handleReply = async (threadId: string, lastMsg: typeof playerMessages[0]) => {
    const body = replyBody[threadId];
    if (!body?.trim()) return;
    await addMessage({
      id: generateId('MSG'),
      from_id: user.player_id!,
      to_id: lastMsg.from_id === user.player_id ? (lastMsg.to_id === 'all' ? 'admin' : lastMsg.to_id) : lastMsg.from_id,
      subject: lastMsg.subject.startsWith('Re:') ? lastMsg.subject : `Re: ${lastMsg.subject}`,
      body,
      date: new Date().toISOString().split('T')[0],
      read: false,
      reply_to: lastMsg.id,
      timestamp: new Date().toISOString(),
    });
    toast({ title: 'Reply Sent' });
    setReplyBody(prev => ({ ...prev, [threadId]: '' }));
  };

  const getDisplayName = (id: string) => {
    if (id === 'admin') return '🛡️ Admin';
    if (id === 'all') return '📢 All Players';
    return players.find(p => p.player_id === id)?.name || id;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 space-y-6">
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
              <div><p className="text-2xl font-bold text-primary">{totalMatches}</p><p className="text-xs text-muted-foreground">Matches</p></div>
              <div><p className="text-2xl font-bold text-accent">{battingStats?.totalRuns || 0}</p><p className="text-xs text-muted-foreground">Runs</p></div>
              <div><p className="text-2xl font-bold text-destructive">{bowlingStats?.totalWickets || 0}</p><p className="text-xs text-muted-foreground">Wickets</p></div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="stats">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="stats" className="flex items-center gap-1"><BarChart3 className="h-4 w-4" /> Career Stats</TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" /> Messages
              {playerMessages.filter(m => !m.read && m.from_id !== user.player_id && m.to_id !== 'all').length > 0 && (
                <Badge className="ml-1 bg-destructive text-destructive-foreground text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full">
                  {playerMessages.filter(m => !m.read && m.from_id !== user.player_id).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-1"><Headphones className="h-4 w-4" /> Support</TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-1"><Settings className="h-4 w-4" /> Account</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-6 mt-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Tournament</label>
                <Select value={filterTournament} onValueChange={(v) => { setFilterTournament(v); setFilterSeason('all'); }}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tournaments</SelectItem>
                    {tournaments.map(t => <SelectItem key={t.tournament_id} value={t.tournament_id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Season</label>
                <Select value={filterSeason} onValueChange={setFilterSeason}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Seasons</SelectItem>
                    {relevantSeasons.map(s => <SelectItem key={s.season_id} value={s.season_id}>{s.year} ({s.season_id})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card>
              <CardHeader><CardTitle className="font-display">🏏 Batting Statistics</CardTitle></CardHeader>
              <CardContent>
                {battingStats ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {[['Innings', battingStats.innings], ['Runs', battingStats.totalRuns], ['Average', battingStats.avg.toFixed(2)], ['Strike Rate', battingStats.sr.toFixed(1)], ['Highest', battingStats.highest], ['4s', battingStats.totalFours], ['6s', battingStats.totalSixes], ['50s', battingStats.fifties], ['100s', battingStats.hundreds], ['30s', battingStats.thirties]].map(([label, value]) => (
                      <div key={String(label)} className="bg-muted rounded-lg p-3 text-center">
                        <p className="text-xl font-bold">{value}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-muted-foreground">No batting data available.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display">🎯 Bowling Statistics</CardTitle></CardHeader>
              <CardContent>
                {bowlingStats ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {[['Innings', bowlingStats.innings], ['Overs', bowlingStats.totalOvers], ['Wickets', bowlingStats.totalWickets], ['Economy', bowlingStats.economy.toFixed(2)], ['Average', bowlingStats.avg.toFixed(2)], ['Maidens', bowlingStats.totalMaidens], ['Best', bowlingStats.bestFigures], ['3W', bowlingStats.threeWickets], ['5W', bowlingStats.fiveWickets]].map(([label, value]) => (
                      <div key={String(label)} className="bg-muted rounded-lg p-3 text-center">
                        <p className="text-xl font-bold">{value}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-muted-foreground">No bowling data available.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-display">📋 Match History</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Match</TableHead><TableHead>Date</TableHead><TableHead>Teams</TableHead><TableHead>Runs</TableHead><TableHead>Wickets</TableHead><TableHead>Result</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {matches.filter(m => relevantMatchIds.includes(m.match_id) &&
                      (batting.some(b => b.player_id === user.player_id && b.match_id === m.match_id) ||
                       bowling.some(b => b.player_id === user.player_id && b.match_id === m.match_id))
                    ).map(match => {
                      const bat = batting.find(b => b.player_id === user.player_id && b.match_id === match.match_id);
                      const bowl = bowling.find(b => b.player_id === user.player_id && b.match_id === match.match_id);
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
            {threads.length === 0 && <p className="text-muted-foreground">No messages.</p>}
            {threads.map(([rootId, thread]) => {
              const root = thread[0];
              const unreadCount = thread.filter(m => !m.read && m.from_id !== user.player_id).length;
              const isExpanded = expandedThread === rootId;
              
              return (
                <Card key={rootId} className={unreadCount > 0 ? 'border-l-4 border-l-accent' : ''}>
                  <div
                    className="p-4 cursor-pointer hover:bg-muted/30"
                    onClick={() => {
                      setExpandedThread(isExpanded ? '' : rootId);
                      thread.filter(m => !m.read && m.from_id !== user.player_id).forEach(m => updateMessage({ ...m, read: true }));
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{root.subject}</span>
                        {unreadCount > 0 && <Badge className="bg-accent text-accent-foreground text-xs">{unreadCount} new</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground">{thread.length} msg{thread.length > 1 ? 's' : ''}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{getDisplayName(root.from_id)} • {format(new Date(thread[thread.length - 1].timestamp || thread[thread.length - 1].date), 'dd MMM HH:mm')}</p>
                  </div>

                  {isExpanded && (
                    <CardContent className="pt-0 border-t">
                      <div className="max-h-[400px] overflow-y-auto space-y-3 py-3 scrollbar-thin">
                        {thread.map(msg => (
                          <div key={msg.id} className={`flex ${msg.from_id === user.player_id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-lg p-3 ${msg.from_id === user.player_id ? 'bg-primary/10 border border-primary/20' : 'bg-muted'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold">{getDisplayName(msg.from_id)}</span>
                                <span className="text-xs text-muted-foreground">{format(new Date(msg.timestamp || msg.date), 'dd MMM HH:mm')}</span>
                                {msg.from_id === user.player_id && (
                                  msg.read ? <CheckCheck className="h-3 w-3 text-primary" /> : <Clock className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                              <p className="text-sm">{msg.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-3 border-t">
                        <Input
                          placeholder="Type your reply..."
                          value={replyBody[rootId] || ''}
                          onChange={e => setReplyBody(prev => ({ ...prev, [rootId]: e.target.value }))}
                          className="flex-1"
                        />
                        <Button size="sm" onClick={() => handleReply(rootId, thread[thread.length - 1])} disabled={!replyBody[rootId]?.trim()}>
                          <Send className="h-3 w-3 mr-1" /> Reply
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="support" className="mt-4">
            <PlayerSupport playerId={user.player_id!} />
          </TabsContent>

          <TabsContent value="account" className="mt-4">
            <PlayerEmailSettings playerId={user.player_id!} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PlayerDashboard;

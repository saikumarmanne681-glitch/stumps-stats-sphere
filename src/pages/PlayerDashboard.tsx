import { useState, useMemo, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useData } from '@/lib/DataContext';
import { calcBattingStats, calcBowlingStats, getPlayerMatchCount, getPlayerMomCount } from '@/lib/calculations';
import { generateId } from '@/lib/utils';
import { BarChart3, MessageSquare, User, Send, CheckCheck, Clock, Headphones, Settings, TrendingUp, Target, Award, Activity, Trophy, Crown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { PlayerSupport } from '@/components/player/PlayerSupport';
import { PlayerEmailSettings } from '@/components/player/PlayerEmailSettings';
import { SessionFingerprint, SecurityShieldBadge, DataIntegrityBadge } from '@/components/SecurityBadge';
import { logAudit, v2api } from '@/lib/v2api';
import { resolvePlayerIdFromIdentity } from '@/lib/dataUtils';
import { PendingActionsPanel } from '@/components/PendingActionsPanel';
import { formatDateInIST, formatInIST } from '@/lib/time';
import { CertificateRecord, CertificateTemplateRecord, buildCertificateTemplateMap, certificateMatchesPlayer, isCertificateCertified, resolveCertificateTemplate } from '@/lib/certificates';
import { CertificatePreview } from '@/components/certificates/CertificatePreview';
import { getPublicVerifyCertificateUrl } from '@/lib/publicUrl';

interface PlayerMilestoneClub {
  key: string;
  label: string;
  stat: 'runs' | 'wickets';
  threshold: number;
  icon: string;
}

const playerMilestoneClubs: PlayerMilestoneClub[] = [
  { key: 'runs-300', label: '300 Runs Club', stat: 'runs', threshold: 300, icon: '🔥' },
  { key: 'runs-500', label: '500 Runs Club', stat: 'runs', threshold: 500, icon: '🚀' },
  { key: 'runs-1000', label: '1000 Runs Club', stat: 'runs', threshold: 1000, icon: '💎' },
  { key: 'wickets-25', label: '25 Wickets Club', stat: 'wickets', threshold: 25, icon: '🎯' },
  { key: 'wickets-50', label: '50 Wickets Club', stat: 'wickets', threshold: 50, icon: '⚡' },
  { key: 'wickets-100', label: '100 Wickets Club', stat: 'wickets', threshold: 100, icon: '🛡️' },
];

const PlayerDashboard = () => {
  const { user, isPlayer } = useAuth();
  const { toast } = useToast();
  const { players, tournaments, seasons, matches, batting, bowling, messages, addMessage, updateMessage, loading } = useData();
  const [filterTournament, setFilterTournament] = useState<string>('all');
  const [filterSeason, setFilterSeason] = useState<string>('all');
  const [replyBody, setReplyBody] = useState<Record<string, string>>({});
  const [expandedThread, setExpandedThread] = useState<string>('');
  const [replySending, setReplySending] = useState<string | null>(null);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [certificateTemplates, setCertificateTemplates] = useState<CertificateTemplateRecord[]>([]);
  const certificateTemplateMap = useMemo(() => buildCertificateTemplateMap(certificateTemplates), [certificateTemplates]);

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
  const momCount = useMemo(() => {
    if (!user?.player_id) return 0;
    return matches.filter((match) => (
      relevantMatchIds.includes(match.match_id) &&
      resolvePlayerIdFromIdentity(match.man_of_match, players) === user.player_id
    )).length;
  }, [matches, players, relevantMatchIds, user?.player_id]);

  const playerMessages = useMemo(() => user?.player_id ? messages.filter(m => m.to_id === user.player_id || m.to_id === 'all' || m.from_id === user.player_id) : [], [user?.player_id, messages]);


  useEffect(() => {
    Promise.all([v2api.getCertificates(), v2api.getCertificateTemplates()]).then(([rows, templates]) => {
      const normalizedPlayerId = String(user?.player_id || '').trim().toLowerCase();
      const normalizedPlayerName = String(player?.name || '').trim().toLowerCase();
      const normalizedUsername = String(user?.username || '').trim().toLowerCase();
      setCertificateTemplates(templates);
      setCertificates(rows.filter((item) => (
        !!normalizedPlayerId
        && (
          certificateMatchesPlayer(item, normalizedPlayerId)
          || String(item.recipient_id || '').trim().toLowerCase() === normalizedUsername
          || String(item.recipient_name || '').trim().toLowerCase() === normalizedPlayerName
        )
      )));
    });
  }, [player?.name, user?.player_id, user?.username]);

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
    setReplySending(threadId);
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
    logAudit(user.player_id!, 'player_reply_message', 'message', threadId, JSON.stringify({ to: lastMsg.from_id }));
    toast({ title: 'Reply Sent' });
    setReplyBody(prev => ({ ...prev, [threadId]: '' }));
    setReplySending(null);
  };

  const getDisplayName = (id: string) => {
    if (id === 'admin') return '🛡️ Admin';
    if (id === 'all') return '📢 All Players';
    return players.find(p => p.player_id === id)?.name || id;
  };

  const unreadCount = playerMessages.filter(m => !m.read && m.from_id !== user.player_id).length;
  const captainTitleRecords = useMemo(() => {
    if (!user?.player_id) return [];
    return seasons.flatMap((season) => {
      const winnerTeam = String(season.winner_team || '').trim();
      if (!winnerTeam) return [];
      const seasonMatches = matches
        .filter((match) => match.season_id === season.season_id && match.status === 'completed')
        .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      const winningTeamMatch = seasonMatches.find((match) => match.team_a === winnerTeam || match.team_b === winnerTeam);
      if (!winningTeamMatch) return [];
      const captainId = winningTeamMatch.team_a === winnerTeam ? winningTeamMatch.team_a_captain : winningTeamMatch.team_b_captain;
      if (String(captainId || '') !== user.player_id) return [];
      return [{
        season: season.year || season.season_id,
        team: winnerTeam,
      }];
    });
  }, [matches, seasons, user?.player_id]);
  const hallOfGloryMilestones = useMemo(() => {
    const dateByMatchId = new Map(matches.map((match) => [match.match_id, match.date]));
    const runEvents = batting
      .filter((entry) => entry.player_id === user.player_id)
      .map((entry) => ({ matchId: entry.match_id, date: dateByMatchId.get(entry.match_id) || '', amount: entry.runs }))
      .filter((entry) => !!entry.date)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const wicketEvents = bowling
      .filter((entry) => entry.player_id === user.player_id)
      .map((entry) => ({ matchId: entry.match_id, date: dateByMatchId.get(entry.match_id) || '', amount: entry.wickets }))
      .filter((entry) => !!entry.date)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return playerMilestoneClubs.map((club) => {
      const source = club.stat === 'runs' ? runEvents : wicketEvents;
      let cumulative = 0;
      for (const event of source) {
        cumulative += event.amount;
        if (cumulative >= club.threshold) {
          return { ...club, reached: true, reachedOn: event.date, matchId: event.matchId, reachedValue: cumulative };
        }
      }
      return { ...club, reached: false, reachedOn: '', matchId: '', reachedValue: cumulative };
    });
  }, [batting, bowling, matches, user.player_id]);
  const unlockedHallOfGloryCount = hallOfGloryMilestones.filter((item) => item.reached).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 space-y-6">
        {loading && <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">Refreshing player dashboard data, please wait...</p>}
        {/* Enhanced Player Hero Card */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                <User className="h-10 w-10 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="font-display text-2xl md:text-3xl font-bold">{player.name}</h1>
                  <SecurityShieldBadge label="Verified" />
                </div>
                <p className="text-muted-foreground">{player.role.toUpperCase()} • {player.player_id}</p>
                <p className="text-sm text-muted-foreground">{player.phone}</p>
                <SessionFingerprint />
              </div>
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-xl bg-primary/10">
                  <Activity className="h-4 w-4 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-bold text-primary">{totalMatches}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Matches</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-accent/10">
                  <TrendingUp className="h-4 w-4 text-accent mx-auto mb-1" />
                  <p className="text-2xl font-bold text-accent">{battingStats?.totalRuns || 0}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Runs</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-destructive/10">
                  <Target className="h-4 w-4 text-destructive mx-auto mb-1" />
                  <p className="text-2xl font-bold text-destructive">{bowlingStats?.totalWickets || 0}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Wickets</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-amber-500/10">
                  <Trophy className="h-4 w-4 text-amber-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-amber-600">{momCount}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">MOM Wins</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Unread messages</p>
              <p className="mt-1 font-display text-3xl font-bold text-accent">{unreadCount}</p>
              <p className="text-xs text-muted-foreground">Direct responses from admin and management.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Current filters</p>
              <p className="mt-1 text-sm font-medium">{filterTournament === 'all' ? 'All tournaments' : tournaments.find((t) => t.tournament_id === filterTournament)?.name || filterTournament}</p>
              <p className="text-xs text-muted-foreground">{filterSeason === 'all' ? 'All seasons' : `Season ${seasons.find((s) => s.season_id === filterSeason)?.year || filterSeason}`}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Linked certificates</p>
              <p className="mt-1 font-display text-3xl font-bold text-primary">{certificates.length}</p>
              <p className="text-xs text-muted-foreground">
                {certificates.filter((item) => isCertificateCertified(item)).length} certified documents linked to your player profile.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Verified session</p>
              <div className="mt-1 flex items-center gap-2">
                <SecurityShieldBadge label="Protected" variant="certified" />
                <SessionFingerprint />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Profile integrity</p>
              <div className="mt-2">
                <DataIntegrityBadge data={`${player.player_id}:${player.username}:${totalMatches}:${battingStats?.totalRuns || 0}:${bowlingStats?.totalWickets || 0}`} label="Player dashboard hash" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Captaincy titles</p>
              <p className="mt-1 font-display text-3xl font-bold text-amber-600">{captainTitleRecords.length}</p>
              <p className="text-xs text-muted-foreground">Titles won as captain.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Hall of glory clubs</p>
              <p className="mt-1 font-display text-3xl font-bold text-primary">{unlockedHallOfGloryCount}</p>
              <p className="text-xs text-muted-foreground">Milestone clubs unlocked from career runs/wickets.</p>
            </CardContent>
          </Card>
        </div>

        <PendingActionsPanel
          title="Pending Player Actions"
          items={[
            {
              id: 'messages-unread',
              label: 'Unread messages',
              description: 'Unread administrative or management communications in your inbox.',
              count: unreadCount,
              to: '/player',
            },
            {
              id: 'support-followup',
              label: 'Support follow-ups',
              description: 'Track your ongoing support tickets and responses.',
              count: playerMessages.filter((m) => m.subject?.toLowerCase().includes('support') && !m.read && m.from_id !== user.player_id).length,
              to: '/player',
            },
          ]}
        />

        <Tabs defaultValue="stats">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="stats" className="flex items-center gap-1"><BarChart3 className="h-4 w-4" /> Career Stats</TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" /> Messages
              {unreadCount > 0 && (
                <Badge className="ml-1 bg-destructive text-destructive-foreground text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-1"><Headphones className="h-4 w-4" /> Support</TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-1"><Settings className="h-4 w-4" /> Account</TabsTrigger>
            <TabsTrigger value="certificates" className="flex items-center gap-1"><Award className="h-4 w-4" /> Certificates</TabsTrigger>
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
            {captainTitleRecords.length > 0 && (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader>
                  <CardTitle className="font-display">Captaincy achievements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {captainTitleRecords.map((record) => (
                      <Badge key={`${record.team}-${record.season}`} variant="outline" className="rounded-full">
                        {record.team} • Season {record.season} • Champion Captain
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2"><Crown className="h-5 w-5 text-primary" /> Hall of Glory milestones</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {hallOfGloryMilestones.map((milestone) => (
                  <div key={milestone.key} className="rounded-lg border bg-background/90 p-3">
                    <p className="font-medium">{milestone.icon} {milestone.label}</p>
                    {milestone.reached ? (
                      <>
                        <p className="text-sm text-primary">Unlocked at {milestone.reachedValue} {milestone.stat}</p>
                        <p className="text-xs text-muted-foreground">Reached on {formatDateInIST(milestone.reachedOn)} ({milestone.matchId})</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">{milestone.reachedValue}/{milestone.threshold} {milestone.stat} so far</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Batting */}
            <Card className="border-l-4 border-l-primary">
              <CardHeader><CardTitle className="font-display flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Batting Statistics</CardTitle></CardHeader>
              <CardContent>
                {battingStats ? (
                  <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-5 gap-3">
                    {([['Innings', battingStats.innings], ['Runs', battingStats.totalRuns], ['Average', battingStats.avg.toFixed(2)], ['Strike Rate', battingStats.sr.toFixed(1)], ['Highest', battingStats.highest], ['4s', battingStats.totalFours], ['6s', battingStats.totalSixes], ['50s', battingStats.fifties], ['100s', battingStats.hundreds], ['30s', battingStats.thirties]] as [string, string | number][]).map(([label, value]) => (
                      <div key={label} className="bg-gradient-to-br from-muted/80 to-muted/40 rounded-xl p-3 text-center border border-border/50 hover:border-primary/30 transition-colors">
                        <p className="text-xl font-bold text-primary">{value}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-muted-foreground">No batting data available.</p>}
              </CardContent>
            </Card>

            {/* Bowling */}
            <Card className="border-l-4 border-l-destructive">
              <CardHeader><CardTitle className="font-display flex items-center gap-2"><Target className="h-5 w-5 text-destructive" /> Bowling Statistics</CardTitle></CardHeader>
              <CardContent>
                {bowlingStats ? (
                  <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-5 gap-3">
                    {([['Innings', bowlingStats.innings], ['Overs', bowlingStats.totalOvers], ['Wickets', bowlingStats.totalWickets], ['Economy', bowlingStats.economy.toFixed(2)], ['Average', bowlingStats.avg.toFixed(2)], ['Maidens', bowlingStats.totalMaidens], ['Best', bowlingStats.bestFigures], ['3W', bowlingStats.threeWickets], ['5W', bowlingStats.fiveWickets]] as [string, string | number][]).map(([label, value]) => (
                      <div key={label} className="bg-gradient-to-br from-muted/80 to-muted/40 rounded-xl p-3 text-center border border-border/50 hover:border-destructive/30 transition-colors">
                        <p className="text-xl font-bold text-destructive">{value}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-muted-foreground">No bowling data available.</p>}
              </CardContent>
            </Card>

            {/* Match History */}
            <Card>
              <CardHeader><CardTitle className="font-display flex items-center gap-2"><Award className="h-5 w-5 text-accent" /> Match History</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
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
                          <TableRow key={match.match_id} className="hover:bg-muted/50">
                            <TableCell>
                              <Link to={`/match/${match.match_id}`} className="font-mono text-xs hover:text-primary hover:underline">{match.match_id}</Link>
                            </TableCell>
                            <TableCell className="text-sm">{formatDateInIST(match.date)}</TableCell>
                            <TableCell className="font-medium">{match.team_a} vs {match.team_b}</TableCell>
                            <TableCell className="font-bold text-primary">{bat ? `${bat.runs}(${bat.balls})` : '-'}</TableCell>
                            <TableCell className="font-bold text-destructive">{bowl ? `${bowl.wickets}/${bowl.runs_conceded}` : '-'}</TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate">{match.result || '-'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Messages Tab */}
          <TabsContent value="messages" className="space-y-4 mt-4">
            <div className="admin-section-shell overflow-hidden p-5 md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-primary">Inbox</p>
                  <h2 className="font-display text-2xl font-bold flex items-center gap-2">📬 Messages</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Your conversations with admin stay grouped in one clean thread view.</p>
                </div>
                {unreadCount > 0 && <Badge className="w-fit rounded-full bg-destructive px-3 py-1 text-destructive-foreground">{unreadCount} unread</Badge>}
              </div>
            </div>
            {threads.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">No messages. Messages from admin will appear here.</CardContent></Card>}
            {threads.map(([rootId, thread]) => {
              const root = thread[0];
              const threadUnread = thread.filter(m => !m.read && m.from_id !== user.player_id).length;
              const isExpanded = expandedThread === rootId;

              return (
                <Card key={rootId} className={`overflow-hidden rounded-[1.5rem] transition-all ${threadUnread > 0 ? 'border-l-4 border-l-accent shadow-sm' : 'border-primary/10'} ${isExpanded ? 'ring-1 ring-primary/20 shadow-lg shadow-primary/10' : ''}`}>
                  <div
                    className="cursor-pointer bg-gradient-to-r from-background to-primary/5 p-4 transition-colors hover:bg-muted/30"
                    onClick={() => {
                      setExpandedThread(isExpanded ? '' : rootId);
                      thread.filter(m => !m.read && m.from_id !== user.player_id).forEach(m => updateMessage({ ...m, read: true }));
                    }}
                  >
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-sm md:text-base">{root.subject}</span>
                        {threadUnread > 0 && <Badge className="bg-accent text-accent-foreground text-xs">{threadUnread} new</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground">{thread.length} msg{thread.length > 1 ? 's' : ''}</span>
                    </div>
                    <p className="text-xs text-muted-foreground md:text-sm">{getDisplayName(root.from_id)} • {formatInIST(thread[thread.length - 1].timestamp || thread[thread.length - 1].date)}</p>
                  </div>

                  {isExpanded && (
                    <CardContent className="border-t border-primary/10 bg-muted/20 pt-0">
                      <div className="max-h-[420px] overflow-y-auto space-y-4 py-4 scrollbar-thin">
                        {thread.map(msg => (
                          <div key={msg.id} className={`flex ${msg.from_id === user.player_id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[84%] rounded-[1.25rem] border p-4 shadow-sm ${msg.from_id === user.player_id ? 'bg-primary/10 border-primary/20' : 'bg-card border-border'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold">{getDisplayName(msg.from_id)}</span>
                                <span className="text-xs text-muted-foreground">{formatInIST(msg.timestamp || msg.date)}</span>
                                {msg.from_id === user.player_id && (
                                  msg.read ? <CheckCheck className="h-3 w-3 text-primary" /> : <Clock className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                              <p className="text-sm leading-6">{msg.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 border-t border-primary/10 pt-4">
                        <Input
                          placeholder="Type your reply..."
                          value={replyBody[rootId] || ''}
                          onChange={e => setReplyBody(prev => ({ ...prev, [rootId]: e.target.value }))}
                          className="flex-1"
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(rootId, thread[thread.length - 1]); } }}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleReply(rootId, thread[thread.length - 1])}
                          disabled={!replyBody[rootId]?.trim()}
                          loading={replySending === rootId}
                          loadingText="Sending..."
                        >
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

          <TabsContent value="certificates" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Your linked certificates</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">All linked certificates are shown here (draft, pending, approved, and certified) with PDF download support.</p>
              </CardContent>
            </Card>
            {certificates.length === 0 && <p className="text-sm text-muted-foreground">No linked player certificates yet.</p>}
            {certificates.map((certificate) => (
              <CertificatePreview
                key={certificate.id}
                certificate={certificate}
                template={resolveCertificateTemplate(certificate, certificateTemplateMap)}
                verificationUrl={getPublicVerifyCertificateUrl(certificate.id)}
                watermark={isCertificateCertified(certificate)}
                showDownload
                defaultExpanded={false}
              />
            ))}
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

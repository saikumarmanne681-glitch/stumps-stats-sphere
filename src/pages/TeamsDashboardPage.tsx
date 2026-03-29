import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Award, BarChart3, LifeBuoy, Shield, Sparkles, Ticket, Trophy, Users } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/DataContext';
import { v2api } from '@/lib/v2api';
import { SupportTicket, TeamProfile, TeamTitleRecord } from '@/lib/v2types';
import { compareTimestampsDesc, formatInIST } from '@/lib/time';

interface TeamSummary {
  name: string;
  played: number;
  wins: number;
  losses: number;
  winPct: number;
  titles: number;
  runnerUps: number;
  lastResult: string;
}

const ticketBadgeClass: Record<string, string> = {
  open: 'bg-primary/10 text-primary border-primary/30',
  in_progress: 'bg-accent/10 text-accent border-accent/30',
  waiting_for_user: 'bg-amber-100 text-amber-900 border-amber-300',
  resolved: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  closed: 'bg-muted text-muted-foreground border-border',
};

export default function TeamsDashboardPage() {
  const { isManagement, user } = useAuth();
  const { matches, seasons, tournaments } = useData();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [profiles, setProfiles] = useState<TeamProfile[]>([]);
  const [titles, setTitles] = useState<TeamTitleRecord[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [ticketRows, profileRows, titleRows] = await Promise.all([
        v2api.getTickets(),
        v2api.getTeamProfiles(),
        v2api.getTeamTitles(),
      ]);
      if (cancelled) return;
      setTickets(ticketRows);
      setProfiles(profileRows);
      setTitles(titleRows);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isManagement) return <Navigate to="/login" replace />;

  const computedTeamNames = useMemo(() => {
    const names = new Set<string>();
    matches.forEach((match) => {
      if (match.team_a?.trim()) names.add(match.team_a.trim());
      if (match.team_b?.trim()) names.add(match.team_b.trim());
    });
    seasons.forEach((season) => {
      if (season.winner_team?.trim()) names.add(season.winner_team.trim());
      if (season.runner_up_team?.trim()) names.add(season.runner_up_team.trim());
    });
    profiles.forEach((profile) => {
      if (profile.team_name?.trim()) names.add(profile.team_name.trim());
    });
    titles.forEach((title) => {
      if (title.team_name?.trim()) names.add(title.team_name.trim());
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [matches, profiles, seasons, titles]);

  const teamSummaries = useMemo<TeamSummary[]>(() => {
    return computedTeamNames.map((teamName) => {
      const completed = matches.filter((m) => m.status === 'completed' && (m.team_a === teamName || m.team_b === teamName));
      const wins = completed.filter((m) => {
        const result = String(m.result || '').toLowerCase();
        return result.includes(teamName.toLowerCase()) && (result.includes('won') || result.includes('beat'));
      }).length;
      const losses = Math.max(completed.length - wins, 0);
      const titleCount = seasons.filter((s) => s.winner_team === teamName).length + titles.filter((t) => t.team_name === teamName && t.result_type === 'winner').length;
      const runnerUpCount = seasons.filter((s) => s.runner_up_team === teamName).length + titles.filter((t) => t.team_name === teamName && t.result_type === 'runner_up').length;
      const lastMatch = completed.sort((a, b) => compareTimestampsDesc(a.date, b.date))[0];
      return {
        name: teamName,
        played: completed.length,
        wins,
        losses,
        winPct: completed.length ? Number(((wins / completed.length) * 100).toFixed(1)) : 0,
        titles: titleCount,
        runnerUps: runnerUpCount,
        lastResult: lastMatch?.result || 'No completed match yet',
      };
    }).sort((a, b) => b.winPct - a.winPct || b.titles - a.titles || a.name.localeCompare(b.name));
  }, [computedTeamNames, matches, seasons, titles]);

  const visibleTeams = selectedTeam === 'all' ? teamSummaries : teamSummaries.filter((entry) => entry.name === selectedTeam);
  const visibleTickets = selectedTeam === 'all'
    ? tickets
    : tickets.filter((ticket) => {
      const teamGuess = String((ticket as Record<string, unknown>).team_name || '').trim();
      return teamGuess === selectedTeam || String(ticket.subject || '').toLowerCase().includes(selectedTeam.toLowerCase());
    });

  const openTickets = visibleTickets.filter((t) => t.status === 'open').length;
  const inProgressTickets = visibleTickets.filter((t) => t.status === 'in_progress').length;
  const resolvedTickets = visibleTickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
  const totalTitles = visibleTeams.reduce((sum, team) => sum + team.titles, 0);
  const totalPlayed = visibleTeams.reduce((sum, team) => sum + team.played, 0);

  const titleTimeline = titles
    .filter((record) => selectedTeam === 'all' || record.team_name === selectedTeam)
    .sort((a, b) => compareTimestampsDesc(a.won_on, b.won_on));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Management command center</p>
            <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Sparkles className="h-7 w-7 text-primary" /> Teams Insights Dashboard</h1>
            <p className="text-muted-foreground">Welcome {user?.name || user?.username}. Monitor team performance, honors and support queues in one place.</p>
          </div>
          <div className="w-full max-w-sm">
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All teams</SelectItem>
                {computedTeamNames.map((team) => <SelectItem key={team} value={team}>{team}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Teams tracked</p><p className="text-2xl font-bold">{visibleTeams.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Matches played</p><p className="text-2xl font-bold">{totalPlayed}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Titles won</p><p className="text-2xl font-bold text-primary">{totalTitles}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open tickets</p><p className="text-2xl font-bold">{openTickets}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Resolved tickets</p><p className="text-2xl font-bold text-emerald-700">{resolvedTickets}</p></CardContent></Card>
        </div>

        <Tabs defaultValue="insights" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="insights" className="gap-1"><BarChart3 className="h-4 w-4" /> Insights</TabsTrigger>
            <TabsTrigger value="tickets" className="gap-1"><LifeBuoy className="h-4 w-4" /> Support tickets</TabsTrigger>
            <TabsTrigger value="honors" className="gap-1"><Award className="h-4 w-4" /> Honors timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Team performance table</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-3">Team</th>
                        <th className="py-2 pr-3">Played</th>
                        <th className="py-2 pr-3">Wins</th>
                        <th className="py-2 pr-3">Losses</th>
                        <th className="py-2 pr-3">Win %</th>
                        <th className="py-2 pr-3">Titles</th>
                        <th className="py-2 pr-3">Runner-up</th>
                        <th className="py-2">Latest result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleTeams.map((team) => (
                        <tr key={team.name} className="border-b last:border-0">
                          <td className="py-2 pr-3 font-medium">{team.name}</td>
                          <td className="py-2 pr-3">{team.played}</td>
                          <td className="py-2 pr-3">{team.wins}</td>
                          <td className="py-2 pr-3">{team.losses}</td>
                          <td className="py-2 pr-3">{team.winPct}%</td>
                          <td className="py-2 pr-3">{team.titles}</td>
                          <td className="py-2 pr-3">{team.runnerUps}</td>
                          <td className="py-2">{team.lastResult}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {visibleTeams.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No team data found yet. You can seed TEAM_PROFILES / TEAM_TITLES sheets without impacting existing modules.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open</p><p className="text-2xl font-bold">{openTickets}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">In progress</p><p className="text-2xl font-bold">{inProgressTickets}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Resolved/Closed</p><p className="text-2xl font-bold">{resolvedTickets}</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Ticket className="h-5 w-5" /> Latest support tickets</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {visibleTickets.sort((a, b) => compareTimestampsDesc(a.created_at, b.created_at)).slice(0, 20).map((ticket) => (
                  <div key={ticket.ticket_id} className="rounded-lg border p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground">{ticket.ticket_id} · {ticket.category} · {ticket.priority.toUpperCase()}</p>
                      </div>
                      <Badge className={ticketBadgeClass[ticket.status] || ticketBadgeClass.open}>{ticket.status.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{ticket.description}</p>
                    <p className="text-xs mt-2 text-muted-foreground">Raised: {formatInIST(ticket.created_at)} · Due: {formatInIST(ticket.resolution_due)}</p>
                  </div>
                ))}
                {visibleTickets.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No tickets for this selection.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="honors" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" /> Team titles and tournament honors</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {titleTimeline.map((record) => (
                  <div key={record.title_id} className="flex items-start gap-3 rounded-lg border p-3">
                    <Shield className="mt-1 h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium">{record.team_name} · {record.competition_name}</p>
                      <p className="text-sm text-muted-foreground">{record.season_label || 'Season N/A'} · {record.result_type === 'winner' ? 'Champion 🏆' : 'Runner-up 🥈'}</p>
                      <p className="text-xs text-muted-foreground">{formatInIST(record.won_on)}</p>
                    </div>
                  </div>
                ))}
                {titleTimeline.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No team title records in TEAM_TITLES yet. Existing season winner/runner-up data remains untouched.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {loading && <p className="text-sm text-muted-foreground">Loading dashboard datasets…</p>}

        <Card className="border-dashed bg-muted/30">
          <CardContent className="p-4 text-sm text-muted-foreground">
            <p className="font-medium">Optional Google Sheets extension (safe, non-breaking):</p>
            <p className="mt-1">You can add TEAM_PROFILES and TEAM_TITLES sheets for richer team metadata and title history. The dashboard also works from existing matches/seasons if these new sheets are empty.</p>
            <p className="mt-1">Tournaments loaded: {tournaments.length}.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

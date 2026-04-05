import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Award, BarChart3, Crown, LifeBuoy, Megaphone, Shield, Sparkles, Swords, Ticket, Trophy, Users, FileBadge2 } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/DataContext';
import { v2api } from '@/lib/v2api';
import { SupportTicket, TeamProfile } from '@/lib/v2types';
import { CertificateRecord, CertificateTemplateRecord, certificateMatchesTeam, isCertificateCertified } from '@/lib/certificates';
import { CertificatePreview } from '@/components/certificates/CertificatePreview';
import { Announcement } from '@/lib/types';
import { compareTimestampsDesc, formatInIST } from '@/lib/time';
import { generateId } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getPublicVerifyCertificateUrl } from '@/lib/publicUrl';

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
  const { isManagement, isTeam, user } = useAuth();
  const { matches, seasons, tournaments, announcements, players } = useData();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [profiles, setProfiles] = useState<TeamProfile[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [certificateTemplates, setCertificateTemplates] = useState<Record<string, CertificateTemplateRecord>>({});
  const [ticketForm, setTicketForm] = useState({ category: 'general', priority: 'medium' as SupportTicket['priority'], subject: '', description: '' });
  const allMatches = matches;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [ticketRows, profileRows, certificateRows, templateRows] = await Promise.all([
        v2api.getTickets(),
        v2api.getTeamProfiles(),
        v2api.getCertificates(),
        v2api.getCertificateTemplates(),
      ]);
      if (cancelled) return;
      setTickets(ticketRows);
      setProfiles(profileRows);
      setCertificateTemplates(Object.fromEntries(templateRows.map((item) => [item.template_id, item])));
      setCertificates(certificateRows.filter((item) => (
        item.recipient_type === 'team'
        || !!String(item.linked_team_name || '').trim()
      )));
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const computedTeamNames = useMemo(() => {
    const names = new Set<string>();
    allMatches.forEach((match) => {
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
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [allMatches, profiles, seasons]);

  const teamSummaries = useMemo<TeamSummary[]>(() => {
    return computedTeamNames.map((teamName) => {
      const completed = allMatches.filter((m) => m.status === 'completed' && (m.team_a === teamName || m.team_b === teamName));
      const wins = completed.filter((m) => {
        const result = String(m.result || '').toLowerCase();
        return result.includes(teamName.toLowerCase()) && (result.includes('won') || result.includes('beat'));
      }).length;
      const losses = Math.max(completed.length - wins, 0);
      const titleCount = seasons.filter((s) => s.winner_team === teamName).length;
      const runnerUpCount = seasons.filter((s) => s.runner_up_team === teamName).length;
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
  }, [allMatches, computedTeamNames, seasons]);

  const enforcedTeam = isTeam ? (user?.team_name || user?.name || '') : '';
  const resolvedSelectedTeam = isTeam ? enforcedTeam : selectedTeam;
  const selectedTeamAliases = useMemo(() => {
    const base = String(resolvedSelectedTeam || '').trim();
    if (!base || base === 'all') return new Set<string>();
    const aliases = new Set<string>([base.toLowerCase()]);
    const matchingProfile = profiles.find((profile) => profile.team_name === base);
    if (matchingProfile?.short_name) aliases.add(String(matchingProfile.short_name).trim().toLowerCase());
    if (matchingProfile?.team_id) aliases.add(String(matchingProfile.team_id).trim().toLowerCase());
    return aliases;
  }, [profiles, resolvedSelectedTeam]);
  const visibleCertificates = useMemo(() => (
    resolvedSelectedTeam === 'all'
      ? certificates
      : certificates.filter((item) => {
        if (certificateMatchesTeam(item, resolvedSelectedTeam)) return true;
        const recipientId = String(item.recipient_id || '').trim().toLowerCase();
        const recipientName = String(item.recipient_name || '').trim().toLowerCase();
        const linkedTeamName = String(item.linked_team_name || '').trim().toLowerCase();
        return selectedTeamAliases.has(recipientId) || selectedTeamAliases.has(recipientName) || selectedTeamAliases.has(linkedTeamName);
      })
  ), [certificates, resolvedSelectedTeam, selectedTeamAliases]);

  const visibleTeams = resolvedSelectedTeam === 'all' ? teamSummaries : teamSummaries.filter((entry) => entry.name === resolvedSelectedTeam);
  const visibleTickets = resolvedSelectedTeam === 'all'
    ? tickets
    : tickets.filter((ticket) => {
      const teamGuess = String((ticket as unknown as Record<string, unknown>).team_name || '').trim();
      return teamGuess === resolvedSelectedTeam || String(ticket.subject || '').toLowerCase().includes(resolvedSelectedTeam.toLowerCase());
    });

  const openTickets = visibleTickets.filter((t) => t.status === 'open').length;
  const inProgressTickets = visibleTickets.filter((t) => t.status === 'in_progress').length;
  const resolvedTickets = visibleTickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
  const totalTitles = visibleTeams.reduce((sum, team) => sum + team.titles, 0);
  const totalPlayed = visibleTeams.reduce((sum, team) => sum + team.played, 0);

  const titleTimeline = useMemo(() => {
    const records = seasons.flatMap((season) => {
      const date = season.end_date || season.start_date || '';
      const rows = [];
      if (season.winner_team?.trim()) {
        rows.push({
          id: `${season.season_id}:winner`,
          team_name: season.winner_team.trim(),
          competition_name: tournaments.find((t) => t.tournament_id === season.tournament_id)?.name || season.tournament_id || 'Tournament',
          season_label: season.year || season.season_id,
          result_type: 'winner' as const,
          won_on: date,
        });
      }
      if (season.runner_up_team?.trim()) {
        rows.push({
          id: `${season.season_id}:runner_up`,
          team_name: season.runner_up_team.trim(),
          competition_name: tournaments.find((t) => t.tournament_id === season.tournament_id)?.name || season.tournament_id || 'Tournament',
          season_label: season.year || season.season_id,
          result_type: 'runner_up' as const,
          won_on: date,
        });
      }
      return rows;
    });
    return records
      .filter((record) => resolvedSelectedTeam === 'all' || record.team_name === resolvedSelectedTeam)
      .sort((a, b) => compareTimestampsDesc(a.won_on, b.won_on));
  }, [resolvedSelectedTeam, seasons, tournaments]);
  const selectedTeamProfile = profiles.find((profile) => profile.team_name === resolvedSelectedTeam);
  const selectedTeamMatches = allMatches
    .filter((match) => resolvedSelectedTeam !== 'all' && (match.team_a === resolvedSelectedTeam || match.team_b === resolvedSelectedTeam))
    .sort((a, b) => compareTimestampsDesc(a.date, b.date));
  const captaincyTitleTimeline = useMemo(() => {
    if (resolvedSelectedTeam === 'all') return [];
    return seasons.flatMap((season) => {
      const winnerTeam = String(season.winner_team || '').trim();
      if (winnerTeam !== resolvedSelectedTeam) return [];
      const seasonMatches = matches
        .filter((match) => match.season_id === season.season_id && match.status === 'completed')
        .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      const finalForWinner = seasonMatches.find((match) => match.team_a === winnerTeam || match.team_b === winnerTeam);
      if (!finalForWinner) return [];
      const captainId = finalForWinner.team_a === winnerTeam ? finalForWinner.team_a_captain : finalForWinner.team_b_captain;
      const captainName = players.find((player) => player.player_id === captainId)?.name || captainId || 'Unknown';
      return [{ season: season.year || season.season_id, captainName }];
    });
  }, [matches, players, resolvedSelectedTeam, seasons]);
  const tournamentLookup = useMemo(
    () => Object.fromEntries(tournaments.map((item) => [item.tournament_id, item.name])),
    [tournaments],
  );
  const seasonLookup = useMemo(
    () => Object.fromEntries(seasons.map((item) => [item.season_id, item.year])),
    [seasons],
  );
  const trophyByTournament = useMemo(() => {
    const map = new Map<string, number>();
    titleTimeline
      .filter((record) => record.result_type === 'winner')
      .forEach((record) => {
        const competition = record.competition_name || 'Tournament';
        map.set(competition, (map.get(competition) || 0) + 1);
      });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [titleTimeline, tournamentLookup]);
  const managementNews = useMemo(() => {
    const fromAnnouncements: Announcement[] = announcements.filter((item) => item.active);
    return fromAnnouncements.sort((a, b) => compareTimestampsDesc(a.date, b.date)).slice(0, 8);
  }, [announcements]);

  const handleRaiseTicket = async () => {
    if (!ticketForm.subject.trim() || !ticketForm.description.trim()) {
      toast({ title: 'Missing details', description: 'Subject and description are required.', variant: 'destructive' });
      return;
    }
    const teamName = resolvedSelectedTeam !== 'all' ? resolvedSelectedTeam : (user?.team_name || user?.name || user?.username || 'Unknown Team');
    const now = new Date();
    const firstDue = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const resolutionDue = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const payload: SupportTicket = {
      ticket_id: generateId('TKT'),
      created_by_user_id: user?.team_id || user?.management_id || user?.username || 'team',
      category: ticketForm.category,
      priority: ticketForm.priority,
      subject: `[${teamName}] ${ticketForm.subject.trim()}`,
      description: ticketForm.description.trim(),
      attachment_url: '',
      status: 'open',
      assigned_admin_id: 'admin',
      created_at: now.toISOString(),
      first_response_due: firstDue.toISOString(),
      resolution_due: resolutionDue.toISOString(),
      resolved_at: '',
      closed_at: '',
    };
    setSubmittingTicket(true);
    try {
      const ok = await v2api.addTicket(payload);
      if (!ok) throw new Error('Unable to save ticket');
      setTickets((prev) => [payload, ...prev]);
      setTicketForm({ category: 'general', priority: 'medium', subject: '', description: '' });
      toast({ title: 'Ticket raised', description: 'Your support ticket has been sent to admin/management.' });
    } catch {
      toast({ title: 'Ticket failed', description: 'Could not raise ticket right now.', variant: 'destructive' });
    } finally {
      setSubmittingTicket(false);
    }
  };

  if (!isManagement && !isTeam) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Management command center</p>
            <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Sparkles className="h-7 w-7 text-primary" /> Teams Insights Dashboard</h1>
            <p className="text-muted-foreground">Welcome {user?.name || user?.username}. Monitor team performance, announcements, support queues and trophies in one place.</p>
          </div>
          {!isTeam && <div className="w-full max-w-sm">
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All teams</SelectItem>
                {computedTeamNames.map((team) => <SelectItem key={team} value={team}>{team}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>}
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Teams tracked</p><p className="text-2xl font-bold">{visibleTeams.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Matches played</p><p className="text-2xl font-bold">{totalPlayed}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Titles won</p><p className="text-2xl font-bold text-primary">{totalTitles}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open tickets</p><p className="text-2xl font-bold">{openTickets}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Resolved tickets</p><p className="text-2xl font-bold text-emerald-700">{resolvedTickets}</p></CardContent></Card>
        </div>
        <Tabs defaultValue="insights" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-5">
            <TabsTrigger value="insights" className="gap-1"><BarChart3 className="h-4 w-4" /> Insights</TabsTrigger>
            <TabsTrigger value="tickets" className="gap-1"><LifeBuoy className="h-4 w-4" /> Support tickets</TabsTrigger>
            <TabsTrigger value="honors" className="gap-1"><Award className="h-4 w-4" /> Honors timeline</TabsTrigger>
            <TabsTrigger value="matches" className="gap-1"><Swords className="h-4 w-4" /> Match history</TabsTrigger>
            <TabsTrigger value="announcements" className="gap-1"><Megaphone className="h-4 w-4" /> Announcements</TabsTrigger>
            <TabsTrigger value="certificates" className="gap-1"><FileBadge2 className="h-4 w-4" /> Certificates</TabsTrigger>
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
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>Raise support ticket</CardTitle></CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input value={ticketForm.category} onChange={(e) => setTicketForm((prev) => ({ ...prev, category: e.target.value }))} placeholder="general / scoring / schedule" />
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={ticketForm.priority} onValueChange={(value) => setTicketForm((prev) => ({ ...prev, priority: value as SupportTicket['priority'] }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Subject</Label>
                    <Input value={ticketForm.subject} onChange={(e) => setTicketForm((prev) => ({ ...prev, subject: e.target.value }))} placeholder="Short summary of issue" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Description</Label>
                    <Textarea value={ticketForm.description} onChange={(e) => setTicketForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Add complete details of your issue/request" />
                  </div>
                  <div className="md:col-span-2">
                    <Button onClick={handleRaiseTicket} disabled={submittingTicket}>{submittingTicket ? 'Raising ticket...' : 'Raise support ticket'}</Button>
                  </div>
                  <div className="md:col-span-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Support request quality checklist</p>
                    <ul className="mt-2 list-disc pl-4 space-y-1">
                      <li>Include tournament, season and match ID where applicable.</li>
                      <li>Mention expected outcome and any immediate workaround already tried.</li>
                      <li>Provide screenshots or error text in the description for faster triage.</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader><CardTitle className="text-base">Support standards (Admin SLA)</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>✅ First response target: <strong>8 hours</strong></p>
                  <p>✅ Resolution target: <strong>48 hours</strong></p>
                  <p>✅ Critical issues escalated to management board instantly.</p>
                  <p className="text-muted-foreground">Please include match id, tournament, screenshots and expected fix in your request for faster resolution.</p>
                </CardContent>
              </Card>
            </div>
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
            {resolvedSelectedTeam !== 'all' && (
              <Card className="border-primary/30 bg-gradient-to-r from-amber-50 via-background to-primary/5">
                <CardHeader><CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-amber-600" /> Trophy gallery</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {trophyByTournament.map(([competition, count]) => (
                    <div key={competition} className="rounded-xl border bg-card p-4">
                      <p className="text-sm font-semibold">{competition}</p>
                      <p className="text-xs text-muted-foreground mb-2">Championship trophies won</p>
                      <p className="text-2xl">{'🏆'.repeat(Math.min(6, count))}{count > 6 ? ` +${count - 6}` : ''}</p>
                      <p className="text-sm font-medium text-primary mt-2">{count} title{count === 1 ? '' : 's'}</p>
                    </div>
                  ))}
                  {trophyByTournament.length === 0 && <p className="text-sm text-muted-foreground">No winner trophies available yet for this team.</p>}
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" /> Team titles and tournament honors</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {titleTimeline.map((record) => (
                  <div key={record.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <Shield className="mt-1 h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium">{record.team_name} · {record.competition_name}</p>
                      <p className="text-sm text-muted-foreground">{record.season_label || 'Season N/A'} · {record.result_type === 'winner' ? 'Champion 🏆' : 'Runner-up 🥈'}</p>
                      <p className="text-xs text-muted-foreground">{formatInIST(record.won_on)}</p>
                    </div>
                  </div>
                ))}
                {titleTimeline.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No season winner/runner-up records matched this team yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matches" className="space-y-4">
            {resolvedSelectedTeam !== 'all' && selectedTeamProfile && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Team profile</CardTitle></CardHeader>
                <CardContent className="grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
                  <div><p className="text-muted-foreground">Captain</p><p className="font-medium">{selectedTeamProfile.captain_name || 'N/A'}</p></div>
                  <div><p className="text-muted-foreground">Coach</p><p className="font-medium">{selectedTeamProfile.coach_name || 'N/A'}</p></div>
                  <div><p className="text-muted-foreground">Home ground</p><p className="font-medium">{selectedTeamProfile.home_ground || 'N/A'}</p></div>
                  <div><p className="text-muted-foreground">Founded</p><p className="font-medium">{selectedTeamProfile.founded_year || 'N/A'}</p></div>
                </CardContent>
              </Card>
            )}
            {resolvedSelectedTeam !== 'all' && (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader><CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-amber-500" /> Captain title history</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {captaincyTitleTimeline.map((row) => (
                    <Badge key={`${row.season}-${row.captainName}`} variant="outline" className="mr-2 rounded-full">
                      Season {row.season}: {row.captainName}
                    </Badge>
                  ))}
                  {captaincyTitleTimeline.length === 0 && <p className="text-muted-foreground">No captain-linked title records found yet for this team.</p>}
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader><CardTitle>All tournament + season matches for selected team</CardTitle></CardHeader>
              <CardContent>
                {resolvedSelectedTeam === 'all' ? (
                  <p className="text-sm text-muted-foreground">Choose one team from the filter to view every match result by tournament and season.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 pr-3">Date</th>
                          <th className="py-2 pr-3">Tournament</th>
                          <th className="py-2 pr-3">Season</th>
                          <th className="py-2 pr-3">Fixture</th>
                          <th className="py-2 pr-3">Venue</th>
                          <th className="py-2 pr-3">Captain</th>
                          <th className="py-2 pr-3">Status</th>
                          <th className="py-2">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTeamMatches.map((match) => (
                          <tr key={match.match_id} className="border-b">
                            <td className="py-2 pr-3">{formatInIST(match.date)}</td>
                            <td className="py-2 pr-3">{tournamentLookup[match.tournament_id] || match.tournament_id}</td>
                            <td className="py-2 pr-3">{seasonLookup[match.season_id] || match.season_id}</td>
                            <td className="py-2 pr-3">{match.team_a} vs {match.team_b}</td>
                            <td className="py-2 pr-3">{match.venue || 'N/A'}</td>
                            <td className="py-2 pr-3">
                              {match.team_a === resolvedSelectedTeam ? (players.find((p) => p.player_id === match.team_a_captain)?.name || match.team_a_captain || '-') : (players.find((p) => p.player_id === match.team_b_captain)?.name || match.team_b_captain || '-')}
                            </td>
                            <td className="py-2 pr-3"><Badge variant="outline">{match.status}</Badge></td>
                            <td className="py-2">{match.result || 'Pending result'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {selectedTeamMatches.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No matches found for this team yet.</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="certificates" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Linked team certificates</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  All linked team certificates are shown here (draft, pending, approved, and certified) with PDF download support.
                  Certified count: {visibleCertificates.filter((item) => isCertificateCertified(item)).length}.
                </p>
              </CardContent>
            </Card>
            {visibleCertificates.map((certificate) => (
              <CertificatePreview
                key={certificate.id}
                certificate={certificate}
                template={certificateTemplates[certificate.template_id]}
                verificationUrl={getPublicVerifyCertificateUrl(certificate.id)}
                watermark={isCertificateCertified(certificate)}
                showDownload
                defaultExpanded={false}
              />
            ))}
            {visibleCertificates.length === 0 && (
              <p className="text-sm text-muted-foreground">No linked team certificates yet.</p>
            )}
          </TabsContent>

          <TabsContent value="announcements" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" /> Admin & management announcements</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {managementNews.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{item.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">Published: {formatInIST(item.date)}</p>
                  </div>
                ))}
                {managementNews.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No active announcements found.</p>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {loading && <p className="text-sm text-muted-foreground">Loading dashboard datasets…</p>}

      </div>
    </div>
  );
}

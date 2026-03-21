import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Calendar, ExternalLink, Link2, ShieldCheck } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth';
import { canApproveTournamentRegistration, canManageTournament, getActorId, getActorName } from '@/lib/accessControl';
import { useToast } from '@/hooks/use-toast';
import { tournamentService } from './tournamentService';
import { scheduleService } from '@/schedules/scheduleService';
import { ScheduleMatch } from '@/schedules/types';
import { useData } from '@/lib/DataContext';
import { normalizeId } from '@/lib/dataUtils';

const emptyScheduleRow: ScheduleMatch = { match_id: '', date: '', time: '', venue: '', team_a: '', team_b: '', stage: 'League', notes: '' };

const TournamentsHubPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { tournaments: catalogTournaments, seasons } = useData();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [tournamentForm, setTournamentForm] = useState({ name: '', format: 'T20', venue: '', start_date: '', end_date: '', registration_deadline: '', notes: '', season_year: String(new Date().getFullYear()) });
  const [registrationForm, setRegistrationForm] = useState({ team_name: '', contact_name: '', contact_email: '', contact_phone: '', players: '' });
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [approvalComments, setApprovalComments] = useState<Record<string, string>>({});
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleMatch[]>([emptyScheduleRow]);
  const [changeLog, setChangeLog] = useState('');

  useEffect(() => {
    Promise.all([tournamentService.syncFromBackend(), scheduleService.syncFromBackend()]).finally(() => setRefreshKey((value) => value + 1));
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  const registryTournaments = useMemo(() => tournamentService.getTournaments(), [refreshKey]);
  const registrations = useMemo(() => tournamentService.getRegistrations(), [refreshKey]);

  const existingSeasonOptions = useMemo(() =>
    seasons
      .map((season) => {
        const tournament = catalogTournaments.find((item) => normalizeId(item.tournament_id) === normalizeId(season.tournament_id));
        return tournament ? {
          key: `${tournament.tournament_id}::${season.season_id}`,
          tournament_id: tournament.tournament_id,
          season_id: season.season_id,
          season_year: season.year,
          tournament_name: tournament.name,
          format: tournament.format,
          venue: tournament.description || 'Existing tournament season',
          publicPath: `/tournament/${tournament.tournament_id}#season-${season.season_id}`,
          source_type: 'existing' as const,
        } : null;
      })
      .filter(Boolean),
  [catalogTournaments, seasons]);

  const customTournamentOptions = useMemo(() => registryTournaments.map((item) => ({
    key: `${item.tournament_id}::${item.season_id || 'NA'}`,
    tournament_id: item.tournament_id,
    season_id: item.season_id || '',
    season_year: item.season_year || '',
    tournament_name: item.name,
    format: item.format,
    venue: item.venue,
    publicPath: item.public_page_path || `/tournaments/registration/${item.tournament_id}`,
    source_type: (item.source_type || 'custom') as 'custom',
  })), [registryTournaments]);

  const registrationTargets = [...existingSeasonOptions, ...customTournamentOptions];
  const activeTarget = registrationTargets.find((item) => item.key === `${selectedTournament}::${selectedSeason}`) || registrationTargets[0];

  useEffect(() => {
    if (!activeTarget) return;
    setSelectedTournament(activeTarget.tournament_id);
    setSelectedSeason(activeTarget.season_id);
  }, [activeTarget?.key]);

  const activeRegistrations = registrations.filter((item) => normalizeId(item.tournament_id) === normalizeId(activeTarget?.tournament_id) && normalizeId(item.season_id) === normalizeId(activeTarget?.season_id));
  const approvedSchedules = activeTarget ? scheduleService.getApprovedSchedulesForTournament(activeTarget.tournament_id) : [];

  const createTournament = async () => {
    if (!user || !canManageTournament(user)) return;
    const year = Number(tournamentForm.season_year) || tournamentForm.season_year;
    const record = await tournamentService.createTournament({
      name: tournamentForm.name,
      format: tournamentForm.format,
      venue: tournamentForm.venue,
      start_date: tournamentForm.start_date,
      end_date: tournamentForm.end_date,
      registration_deadline: tournamentForm.registration_deadline,
      notes: tournamentForm.notes,
      created_by: getActorId(user),
      status: 'open',
      season_year: year,
      source_type: 'custom',
      public_page_path: '',
    }, user);
    setSelectedTournament(record.tournament_id);
    setSelectedSeason('');
    setTournamentForm({ name: '', format: 'T20', venue: '', start_date: '', end_date: '', registration_deadline: '', notes: '', season_year: String(new Date().getFullYear()) });
    setRefreshKey((value) => value + 1);
    toast({ title: 'Tournament registration page created', description: 'This new competition now has its own dedicated registration page.' });
  };

  const submitRegistration = async () => {
    if (!activeTarget || !user) return;
    try {
      await tournamentService.submitRegistration({
        tournament_id: activeTarget.tournament_id,
        tournament_name: activeTarget.tournament_name,
        season_id: activeTarget.season_id,
        season_year: activeTarget.season_year,
        team_name: registrationForm.team_name,
        contact_name: registrationForm.contact_name,
        contact_email: registrationForm.contact_email,
        contact_phone: registrationForm.contact_phone,
        players_json: JSON.stringify(registrationForm.players.split('\n').map((item) => item.trim()).filter(Boolean)),
        submitted_by: getActorId(user),
        submitted_by_name: getActorName(user),
      }, user);
      setRegistrationForm({ team_name: '', contact_name: '', contact_email: '', contact_phone: '', players: '' });
      setRefreshKey((value) => value + 1);
      toast({ title: 'Registration submitted', description: 'Your team registration is pending Tournament Director approval.' });
    } catch (error) {
      toast({ title: 'Registration blocked', description: error instanceof Error ? error.message : 'Duplicate registration detected.', variant: 'destructive' });
    }
  };

  const createScheduleVersion = async () => {
    if (!activeTarget || !user || !canManageTournament(user)) return;
    await scheduleService.createVersion({
      tournament_id: activeTarget.tournament_id,
      tournament_name: activeTarget.tournament_name,
      matches: scheduleDraft.filter((item) => item.match_id && item.team_a && item.team_b),
      change_log: changeLog,
    }, user);
    setScheduleDraft([emptyScheduleRow]);
    setChangeLog('');
    setRefreshKey((value) => value + 1);
    toast({ title: 'Schedule draft saved', description: 'A new version has been created and previous versions remain archived.' });
  };

  const updateScheduleDraft = (index: number, field: keyof ScheduleMatch, value: string) => {
    setScheduleDraft((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  };

  const submitScheduleForApproval = async (scheduleId: string) => {
    if (!user) return;
    await scheduleService.submitForApproval(scheduleId, user);
    setRefreshKey((value) => value + 1);
    toast({ title: 'Sent for approval', description: 'The office bearer approval workflow has started.' });
  };

  const decideSchedule = async (scheduleId: string, decision: 'approved' | 'rejected') => {
    if (!user) return;
    try {
      if (decision === 'approved') await scheduleService.approveSchedule(scheduleId, approvalComments[scheduleId] || '', user);
      else await scheduleService.rejectSchedule(scheduleId, approvalComments[scheduleId] || '', user);
      setRefreshKey((value) => value + 1);
      toast({ title: `Schedule ${decision}`, description: decision === 'approved' ? 'Your approval has been recorded.' : 'The version moved back to draft.' });
    } catch (error) {
      toast({ title: 'Schedule review failed', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    }
  };

  const reviewRegistration = async (registrationId: string, status: 'approved' | 'rejected') => {
    if (!user || !canApproveTournamentRegistration(user)) return;
    await tournamentService.reviewRegistration(registrationId, status, reviewNotes[registrationId] || '', user);
    setRefreshKey((value) => value + 1);
    toast({ title: `Registration ${status}`, description: 'The applicant can now see the updated status.' });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Competition Ops</p>
            <h1 className="font-display text-3xl font-bold">Tournament Registration</h1>
            <p className="text-muted-foreground">Registrations now link directly to existing tournament seasons, while brand-new competitions get their own separate registration page.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {tournamentService.getTables().map((table) => <Badge key={table} variant="outline">Table: {table}</Badge>)}
            {scheduleService.getTables().map((table) => <Badge key={table} variant="outline">Table: {table}</Badge>)}
          </div>
        </div>

        {canManageTournament(user) && (
          <Card>
            <CardHeader><CardTitle>Create Separate Registration Tournament</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {Object.entries(tournamentForm).map(([key, value]) => (
                <div key={key} className={`space-y-2 ${key === 'notes' ? 'md:col-span-2' : ''}`}>
                  <Label>{key.replace(/_/g, ' ')}</Label>
                  {key === 'notes'
                    ? <Textarea value={value} onChange={(e) => setTournamentForm((prev) => ({ ...prev, [key]: e.target.value }))} />
                    : <Input type={key.includes('date') ? 'date' : key === 'season_year' ? 'number' : 'text'} value={value} onChange={(e) => setTournamentForm((prev) => ({ ...prev, [key]: e.target.value }))} />}
                </div>
              ))}
              <Button onClick={createTournament} disabled={!tournamentForm.name.trim()}>Create Registration Page</Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
          <Card>
            <CardHeader><CardTitle>Registration Targets</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {registrationTargets.length === 0 && <p className="text-sm text-muted-foreground">No tournament seasons are available for registration yet.</p>}
              {registrationTargets.map((item) => {
                const isActive = activeTarget?.key === item.key;
                const targetRegistrations = registrations.filter((registration) => normalizeId(registration.tournament_id) === normalizeId(item.tournament_id) && normalizeId(registration.season_id) === normalizeId(item.season_id));
                return (
                  <button key={item.key} className={`w-full rounded-lg border p-4 text-left ${isActive ? 'border-primary bg-primary/5' : ''}`} onClick={() => { setSelectedTournament(item.tournament_id); setSelectedSeason(item.season_id); }}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold">{item.tournament_name}</p>
                        <p className="text-sm text-muted-foreground">Season {item.season_year || 'Open'} • {item.format}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.source_type === 'existing' ? 'Linked to existing tournament page' : 'Separate registration page'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={item.source_type === 'existing' ? 'outline' : 'default'}>{item.source_type}</Badge>
                        <Badge variant="secondary">{targetRegistrations.length} registration(s)</Badge>
                      </div>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {activeTarget && (
            <Card>
              <CardHeader><CardTitle>{activeTarget.tournament_name}</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-lg border p-4 text-sm space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline"><Calendar className="h-3 w-3 mr-1" />Season {activeTarget.season_year || 'Open'}</Badge>
                    <Badge variant="outline">Tournament ID: {activeTarget.tournament_id}</Badge>
                    {activeTarget.season_id && <Badge variant="outline">Season ID: {activeTarget.season_id}</Badge>}
                  </div>
                  <p><strong>Public page:</strong> <Link className="text-primary inline-flex items-center gap-1" to={activeTarget.publicPath}><Link2 className="h-3.5 w-3.5" /> Open linked page</Link></p>
                  <p><strong>Approved schedule versions:</strong> {approvedSchedules.length}</p>
                  <p className="text-muted-foreground">Duplicate team registrations for the same tournament season are automatically blocked across the UI and sheet sync.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Team name</Label>
                    <Input value={registrationForm.team_name} onChange={(e) => setRegistrationForm((prev) => ({ ...prev, team_name: e.target.value }))} />
                    <Label>Contact name</Label>
                    <Input value={registrationForm.contact_name} onChange={(e) => setRegistrationForm((prev) => ({ ...prev, contact_name: e.target.value }))} />
                    <Label>Contact email</Label>
                    <Input value={registrationForm.contact_email} onChange={(e) => setRegistrationForm((prev) => ({ ...prev, contact_email: e.target.value }))} />
                    <Label>Contact phone</Label>
                    <Input value={registrationForm.contact_phone} onChange={(e) => setRegistrationForm((prev) => ({ ...prev, contact_phone: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Players (one per line)</Label>
                    <Textarea className="min-h-[220px]" value={registrationForm.players} onChange={(e) => setRegistrationForm((prev) => ({ ...prev, players: e.target.value }))} />
                  </div>
                </div>
                <Button onClick={submitRegistration} disabled={!registrationForm.team_name.trim()}><ShieldCheck className="h-4 w-4 mr-1" /> Submit Registration</Button>
              </CardContent>
            </Card>
          )}
        </div>

        {activeTarget && (
          <Card>
            <CardHeader><CardTitle>Registrations</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {activeRegistrations.map((registration) => (
                <div key={registration.registration_id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold">{registration.team_name}</p>
                      <p className="text-sm text-muted-foreground">Season {registration.season_year || 'Open'} · Submitted by {registration.submitted_by_name} · {registration.contact_email}</p>
                    </div>
                    <Badge variant={registration.status === 'approved' ? 'default' : registration.status === 'rejected' ? 'destructive' : 'secondary'}>{registration.status}</Badge>
                  </div>
                  <p className="text-sm">Players: {(JSON.parse(registration.players_json) as string[]).join(', ') || '—'}</p>
                  {canApproveTournamentRegistration(user) && (
                    <div className="space-y-2">
                      <Textarea placeholder="Review note" value={reviewNotes[registration.registration_id] || ''} onChange={(e) => setReviewNotes((prev) => ({ ...prev, [registration.registration_id]: e.target.value }))} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => reviewRegistration(registration.registration_id, 'approved')}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => reviewRegistration(registration.registration_id, 'rejected')}>Reject</Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {activeRegistrations.length === 0 && <p className="text-sm text-muted-foreground">No registrations submitted yet.</p>}
            </CardContent>
          </Card>
        )}

        {activeTarget && (
          <Card>
            <CardHeader><CardTitle>Schedule Versions & Workflow</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {canManageTournament(user) && (
                <div className="rounded-lg border p-4 space-y-3">
                  <p className="font-semibold">Create new schedule version</p>
                  <Textarea placeholder="Change log" value={changeLog} onChange={(e) => setChangeLog(e.target.value)} />
                  {scheduleDraft.map((match, index) => (
                    <div key={index} className="grid gap-2 md:grid-cols-4">
                      {(['match_id', 'date', 'time', 'venue', 'team_a', 'team_b', 'stage', 'notes'] as Array<keyof ScheduleMatch>).map((field) => (
                        <Input key={field} placeholder={field.replace(/_/g, ' ')} value={match[field]} onChange={(e) => updateScheduleDraft(index, field, e.target.value)} />
                      ))}
                    </div>
                  ))}
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={() => setScheduleDraft((prev) => [...prev, emptyScheduleRow])}>Add Match</Button>
                    <Button onClick={createScheduleVersion}>Save Version</Button>
                  </div>
                </div>
              )}

              {[...scheduleService.getSchedules().filter((item) => item.tournament_id === activeTarget.tournament_id)].sort((a, b) => b.version_number - a.version_number).map((schedule) => {
                const previous = scheduleService.getSchedules().find((item) => item.schedule_id === schedule.parent_schedule_id);
                const diff = scheduleService.diffVersions(previous, schedule);
                const approvals = scheduleService.getApprovals().filter((item) => item.schedule_id === schedule.schedule_id);
                return (
                  <div key={schedule.schedule_id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-semibold">Version {schedule.version_number}</p>
                        <p className="text-sm text-muted-foreground">{schedule.timestamp}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant={schedule.status === 'approved' ? 'default' : schedule.status === 'rejected' ? 'destructive' : 'secondary'}>{schedule.status}</Badge>
                        <Badge variant="outline">Hash {schedule.hash.slice(0, 12)}…</Badge>
                      </div>
                    </div>
                    <p className="text-sm"><strong>Change log:</strong> {schedule.change_log || '—'}</p>
                    <div className="space-y-2">
                      {diff.map((entry) => (
                        <div key={entry.match_id} className={`rounded border p-2 text-sm ${entry.kind === 'added' ? 'bg-green-500/10 border-green-500/30' : entry.kind === 'updated' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                          {entry.kind.toUpperCase()} · {entry.current?.team_a || entry.previous?.team_a} vs {entry.current?.team_b || entry.previous?.team_b}
                        </div>
                      ))}
                      {diff.length === 0 && <p className="text-sm text-muted-foreground">Baseline version.</p>}
                    </div>
                    <p className="text-sm text-muted-foreground">Approvals: {approvals.filter((item) => item.decision === 'approved').map((item) => `${item.approver_name} (${item.approver_role})`).join(', ') || 'Pending'}</p>
                    <Textarea placeholder="Approval or rejection note" value={approvalComments[schedule.schedule_id] || ''} onChange={(e) => setApprovalComments((prev) => ({ ...prev, [schedule.schedule_id]: e.target.value }))} />
                    <div className="flex gap-2 flex-wrap">
                      {canManageTournament(user) && schedule.status === 'draft' && <Button variant="outline" onClick={() => submitScheduleForApproval(schedule.schedule_id)}>Send for Approval</Button>}
                      <Button variant="outline" onClick={() => scheduleService.downloadPdf(schedule.schedule_id)} disabled={schedule.status !== 'approved'}>PDF</Button>
                      <Button onClick={() => decideSchedule(schedule.schedule_id, 'approved')} disabled={schedule.status !== 'pending_approval'}>Approve</Button>
                      <Button variant="destructive" onClick={() => decideSchedule(schedule.schedule_id, 'rejected')} disabled={schedule.status !== 'pending_approval'}>Reject</Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Quick links</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {existingSeasonOptions.map((item) => (
              <div key={item.key} className="rounded-lg border p-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.tournament_name}</p>
                  <p className="text-sm text-muted-foreground">Season {item.season_year} · existing tournament page</p>
                </div>
                <Button asChild size="sm" variant="outline"><Link to={item.publicPath}>Open <ExternalLink className="h-3.5 w-3.5 ml-1" /></Link></Button>
              </div>
            ))}
            {customTournamentOptions.map((item) => (
              <div key={item.key} className="rounded-lg border p-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.tournament_name}</p>
                  <p className="text-sm text-muted-foreground">Season {item.season_year || 'Open'} · separate registration page</p>
                </div>
                <Button asChild size="sm" variant="outline"><Link to={item.publicPath}>Open <ExternalLink className="h-3.5 w-3.5 ml-1" /></Link></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TournamentsHubPage;

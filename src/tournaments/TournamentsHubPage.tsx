import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { canApproveTournamentRegistration, canManageTournament, getActorId, getActorName } from '@/lib/accessControl';
import { useToast } from '@/hooks/use-toast';
import { tournamentService } from './tournamentService';
import { scheduleService } from '@/schedules/scheduleService';
import { ScheduleMatch } from '@/schedules/types';
import { useData } from '@/lib/DataContext';
import { generateId } from '@/lib/utils';
import { getScheduleDetailedStatus } from '@/lib/workflowStatus';
import { ActionLoader } from '@/components/LoadingOverlay';
import { LottieMotion } from '@/components/LottieMotion';
import { CalendarDays, CheckCircle2, Clock3, Layers3, PlusCircle, Sparkles, Workflow } from 'lucide-react';

const EMPTY_TOURNAMENT_FORM = {
  name: '',
  format: 'T20',
  venue: '',
  start_date: '',
  end_date: '',
  registration_deadline: '',
  notes: '',
};

const EMPTY_REGISTRATION_FORM = {
  team_name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  players: '',
};

const EMPTY_MATCH: ScheduleMatch = { match_id: '', date: '', time: '', venue: '', team_a: '', team_b: '', stage: 'League', notes: '' };

const TournamentsHubPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { tournaments: masterTournaments, seasons, addTournament, addSeason } = useData();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [tournamentForm, setTournamentForm] = useState(EMPTY_TOURNAMENT_FORM);
  const [registrationForm, setRegistrationForm] = useState(EMPTY_REGISTRATION_FORM);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [approvalComments, setApprovalComments] = useState<Record<string, string>>({});
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleMatch[]>([{ ...EMPTY_MATCH }]);
  const [changeLog, setChangeLog] = useState('');
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [linkedTournamentMode, setLinkedTournamentMode] = useState<'existing' | 'create'>('existing');
  const [selectedMasterTournamentId, setSelectedMasterTournamentId] = useState('');
  const [newSeasonYear, setNewSeasonYear] = useState(String(new Date().getFullYear()));
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [scheduleSeasonId, setScheduleSeasonId] = useState('');

  useEffect(() => {
    Promise.all([tournamentService.syncFromBackend(), scheduleService.syncFromBackend()]).finally(() => setRefreshKey((value) => value + 1));
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  const tournaments = useMemo(() => tournamentService.getTournaments(), [refreshKey]);
  const registrations = useMemo(() => tournamentService.getRegistrations(), [refreshKey]);
  const activeTournament = tournaments.find((item) => item.tournament_id === selectedTournament) || tournaments[0];
  const activeRegistrations = registrations.filter((item) => item.tournament_id === activeTournament?.tournament_id);
  const activeSchedules = activeTournament ? [...scheduleService.getSchedules().filter((item) => item.tournament_id === activeTournament.tournament_id)].sort((a, b) => b.version_number - a.version_number) : [];
  const approvedSchedules = activeTournament ? scheduleService.getApprovedSchedulesForTournament(activeTournament.tournament_id, scheduleSeasonId || activeTournament.linked_season_id || undefined) : [];
  const linkedMasterTournament = activeTournament?.linked_tournament_id ? masterTournaments.find((item) => item.tournament_id === activeTournament.linked_tournament_id) : null;
  const seasonsForActiveTournament = seasons.filter((season) => {
    if (!activeTournament) return false;
    const linkedTournamentId = activeTournament.linked_tournament_id || selectedMasterTournamentId;
    return linkedTournamentId ? season.tournament_id === linkedTournamentId : true;
  }).sort((a, b) => b.year - a.year);

  useEffect(() => {
    if (activeTournament?.linked_season_id) {
      setScheduleSeasonId(activeTournament.linked_season_id);
      setSelectedSeasonId(activeTournament.linked_season_id);
      return;
    }
    if (seasonsForActiveTournament[0]) {
      setScheduleSeasonId(seasonsForActiveTournament[0].season_id);
      setSelectedSeasonId(seasonsForActiveTournament[0].season_id);
    }
  }, [activeTournament?.linked_season_id, seasonsForActiveTournament]);

  const runAction = async (key: string, task: () => Promise<void>) => {
    setActiveAction(key);
    try {
      await task();
    } finally {
      setActiveAction(null);
    }
  };

  const getRegistrationOwner = (status: 'pending' | 'approved' | 'rejected') => {
    if (status === 'pending') return 'Pending with Tournament Director';
    if (status === 'approved') return 'Approved by Tournament Director';
    return 'Returned to applicant';
  };

  const createTournament = async () => {
    if (!user || !canManageTournament(user)) return;
    await runAction('create-tournament', async () => {
      try {
        let linkedTournamentId = selectedMasterTournamentId;
        if (linkedTournamentMode === 'create') {
          linkedTournamentId = generateId('T');
          await addTournament({
            tournament_id: linkedTournamentId,
            name: tournamentForm.name,
            format: tournamentForm.format,
            overs: Number.parseInt(tournamentForm.format.replace(/\D/g, ''), 10) || 20,
            description: tournamentForm.notes || `${tournamentForm.name} registration workspace`,
          });
        }

        let linkedSeasonId = selectedSeasonId;
        if (linkedTournamentId && newSeasonYear.trim() && !linkedSeasonId) {
          linkedSeasonId = generateId('S');
          await addSeason({
            season_id: linkedSeasonId,
            tournament_id: linkedTournamentId,
            year: Number(newSeasonYear),
            start_date: tournamentForm.start_date,
            end_date: tournamentForm.end_date,
            status: 'upcoming',
          });
        }

        const record = await tournamentService.createTournament({
          ...tournamentForm,
          created_by: getActorId(user),
          status: 'open',
          linked_tournament_id: linkedTournamentId,
          linked_season_id: linkedSeasonId,
        }, user);
        setSelectedTournament(record.tournament_id);
        setTournamentForm(EMPTY_TOURNAMENT_FORM);
        setSelectedMasterTournamentId('');
        setSelectedSeasonId('');
        setNewSeasonYear(String(new Date().getFullYear()));
        setRefreshKey((value) => value + 1);
        toast({ title: 'Tournament created', description: 'Registration is open and can now stay linked to the selected season and schedule workflow.' });
      } catch (error) {
        toast({ title: 'Tournament creation failed', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
      }
    });
  };

  const submitRegistration = async () => {
    if (!activeTournament || !user) return;
    await runAction('submit-registration', async () => {
      try {
        await tournamentService.submitRegistration({
          tournament_id: activeTournament.tournament_id,
          team_name: registrationForm.team_name,
          contact_name: registrationForm.contact_name,
          contact_email: registrationForm.contact_email,
          contact_phone: registrationForm.contact_phone,
          players_json: JSON.stringify(registrationForm.players.split('\n').map((item) => item.trim()).filter(Boolean)),
          submitted_by: getActorId(user),
          submitted_by_name: getActorName(user),
        }, user);
        setRegistrationForm(EMPTY_REGISTRATION_FORM);
        setRefreshKey((value) => value + 1);
        toast({ title: 'Registration submitted', description: 'Your team registration is now pending with the Tournament Director.' });
      } catch (error) {
        toast({ title: 'Registration failed', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
      }
    });
  };

  const createScheduleVersion = async () => {
    if (!activeTournament || !user || !canManageTournament(user)) return;
    await runAction('create-schedule', async () => {
      try {
        const scheduleSeason = seasons.find((season) => season.season_id === scheduleSeasonId);
        await scheduleService.createVersion({
          tournament_id: activeTournament.tournament_id,
          tournament_name: activeTournament.name,
          season_id: scheduleSeasonId,
          season_label: scheduleSeason ? `${scheduleSeason.year}` : '',
          matches: scheduleDraft.filter((item) => item.match_id && item.team_a && item.team_b),
          change_log: changeLog,
        }, user);
        setScheduleDraft([{ ...EMPTY_MATCH }]);
        setChangeLog('');
        setRefreshKey((value) => value + 1);
        toast({ title: 'Schedule draft saved', description: 'A new version has been created with season linkage and duplicate-safe submission handling.' });
      } catch (error) {
        toast({ title: 'Unable to save schedule', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
      }
    });
  };

  const updateScheduleDraft = (index: number, field: keyof ScheduleMatch, value: string) => {
    setScheduleDraft((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  };

  const submitScheduleForApproval = async (scheduleId: string) => {
    if (!user) return;
    await runAction(`submit-${scheduleId}`, async () => {
      try {
        await scheduleService.submitForApproval(scheduleId, user);
        setRefreshKey((value) => value + 1);
        toast({ title: 'Sent for approval', description: 'The office bearer approval workflow has started.' });
      } catch (error) {
        toast({ title: 'Unable to submit for approval', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
      }
    });
  };

  const decideSchedule = async (scheduleId: string, decision: 'approved' | 'rejected') => {
    if (!user) return;
    await runAction(`${decision}-${scheduleId}`, async () => {
      try {
        if (decision === 'approved') await scheduleService.approveSchedule(scheduleId, approvalComments[scheduleId] || '', user);
        else await scheduleService.rejectSchedule(scheduleId, approvalComments[scheduleId] || '', user);
        setRefreshKey((value) => value + 1);
        toast({ title: `Schedule ${decision}`, description: decision === 'approved' ? 'Your approval has been recorded.' : 'The version moved back to the Tournament Director.' });
      } catch (error) {
        toast({ title: 'Schedule review failed', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
      }
    });
  };

  const reviewRegistration = async (registrationId: string, status: 'approved' | 'rejected') => {
    if (!user || !canApproveTournamentRegistration(user)) return;
    await runAction(`${status}-${registrationId}`, async () => {
      try {
        await tournamentService.reviewRegistration(registrationId, status, reviewNotes[registrationId] || '', user);
        setRefreshKey((value) => value + 1);
        toast({ title: `Registration ${status}`, description: 'The applicant can now see the updated status and owner.' });
      } catch (error) {
        toast({ title: 'Registration review failed', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
      }
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto space-y-6 px-4 py-8">
        <section className="page-shell hero-gradient p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr] lg:items-center">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Competition ops</Badge>
                <Badge variant="outline">Season-linked schedules</Badge>
                <Badge variant="outline">Duplicate-safe registration flow</Badge>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Tournament workspace</p>
                <h1 className="font-display text-4xl font-bold">Major UI refresh for registrations, schedule approvals, and season linkage</h1>
                <p className="mt-2 max-w-3xl text-muted-foreground">Admins can now tie a registration workspace to an existing tournament, create a linked tournament/season on the fly, draft schedule versions against a season, and see exactly who owns every pending step.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="metric-tile">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Tournament workspaces</p>
                  <p className="mt-2 text-3xl font-bold text-primary">{tournaments.length}</p>
                </div>
                <div className="metric-tile">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Pending registrations</p>
                  <p className="mt-2 text-3xl font-bold text-amber-500">{registrations.filter((item) => item.status === 'pending').length}</p>
                  <p className="text-xs text-muted-foreground">Pending with Tournament Director</p>
                </div>
                <div className="metric-tile">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Approved schedules</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-500">{approvedSchedules.length}</p>
                </div>
              </div>
              {activeAction && <ActionLoader text="Running a guarded tournament action..." />}
            </div>
            <LottieMotion variant="celebration" className="min-h-[250px]" />
          </div>
        </section>

        {canManageTournament(user) && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><PlusCircle className="h-5 w-5 text-primary" /> Create tournament workspace</CardTitle></CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(tournamentForm).map(([key, value]) => (
                  <div key={key} className={`space-y-2 ${key === 'notes' ? 'md:col-span-2' : ''}`}>
                    <Label>{key.replace(/_/g, ' ')}</Label>
                    {key === 'notes'
                      ? <Textarea value={value} onChange={(e) => setTournamentForm((prev) => ({ ...prev, [key]: e.target.value }))} />
                      : <Input type={key.includes('date') ? 'date' : 'text'} value={value} onChange={(e) => setTournamentForm((prev) => ({ ...prev, [key]: e.target.value }))} />}
                  </div>
                ))}
              </div>

              <div className="space-y-4 rounded-[1.5rem] border border-primary/10 bg-primary/5 p-4">
                <div className="space-y-2">
                  <Label>Link registrations to</Label>
                  <Select value={linkedTournamentMode} onValueChange={(value: 'existing' | 'create') => setLinkedTournamentMode(value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="existing">Existing master tournament</SelectItem>
                      <SelectItem value="create">Create new master tournament</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {linkedTournamentMode === 'existing' ? (
                  <div className="space-y-2">
                    <Label>Master tournament</Label>
                    <Select value={selectedMasterTournamentId || '__none'} onValueChange={(value) => setSelectedMasterTournamentId(value === '__none' ? '' : value)}>
                      <SelectTrigger><SelectValue placeholder="Optional existing tournament" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">No linked tournament</SelectItem>
                        {masterTournaments.map((item) => <SelectItem key={item.tournament_id} value={item.tournament_id}>{item.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-primary/10 bg-white/70 p-3 text-sm text-muted-foreground">
                    A new master tournament record will be created automatically using the workspace name, format, and notes.
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Link to existing season</Label>
                  <Select value={selectedSeasonId || '__new'} onValueChange={(value) => setSelectedSeasonId(value === '__new' ? '' : value)}>
                    <SelectTrigger><SelectValue placeholder="Create a new linked season" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__new">Create a new linked season</SelectItem>
                      {seasons.filter((season) => !selectedMasterTournamentId || season.tournament_id === selectedMasterTournamentId).map((season) => (
                        <SelectItem key={season.season_id} value={season.season_id}>{season.year} · {season.status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!selectedSeasonId && (
                  <div className="space-y-2">
                    <Label>New season year</Label>
                    <Input type="number" value={newSeasonYear} onChange={(e) => setNewSeasonYear(e.target.value)} />
                  </div>
                )}

                <Button onClick={createTournament} disabled={!tournamentForm.name.trim()} loading={activeAction === 'create-tournament'} loadingText="Creating workspace...">Create tournament workspace</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
          <Card>
            <CardHeader><CardTitle>Available tournament workspaces</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {tournaments.length === 0 && <p className="text-sm text-muted-foreground">No tournament registry records yet.</p>}
              {tournaments.map((item) => (
                <button key={item.tournament_id} className={`w-full rounded-[1.35rem] border p-4 text-left transition hover:-translate-y-0.5 ${activeTournament?.tournament_id === item.tournament_id ? 'border-primary bg-primary/10 shadow-lg' : 'border-white/70 bg-white/70'}`} onClick={() => setSelectedTournament(item.tournament_id)}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.format} · {item.venue}</p>
                      <p className="text-xs text-muted-foreground">{item.linked_tournament_id ? `Linked tournament: ${item.linked_tournament_id}` : 'Standalone workspace'} · {item.linked_season_id ? `Season: ${item.linked_season_id}` : 'Season not linked yet'}</p>
                    </div>
                    <Badge variant={item.status === 'open' ? 'default' : 'secondary'}>{item.status}</Badge>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {activeTournament && (
            <Card>
              <CardHeader><CardTitle>{activeTournament.name}</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[1.4rem] border p-4 text-sm space-y-1 bg-white/70">
                    <p><strong>Dates:</strong> {activeTournament.start_date} → {activeTournament.end_date}</p>
                    <p><strong>Registration deadline:</strong> {activeTournament.registration_deadline || 'Not set'}</p>
                    <p><strong>Notes:</strong> {activeTournament.notes || '—'}</p>
                  </div>
                  <div className="rounded-[1.4rem] border p-4 text-sm space-y-2 bg-primary/5">
                    <div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-primary" /> <strong>Linked competition data</strong></div>
                    <p>{linkedMasterTournament ? `Master tournament: ${linkedMasterTournament.name}` : 'Master tournament not linked.'}</p>
                    <p>{activeTournament.linked_season_id ? `Primary season: ${activeTournament.linked_season_id}` : 'Primary season not linked.'}</p>
                    <p>Approved schedule versions: {approvedSchedules.length}</p>
                  </div>
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
                    <div className="rounded-2xl border border-primary/10 bg-white/70 p-3 text-sm text-muted-foreground">
                      Workflow owner after submit: <strong>Tournament Director</strong>.
                    </div>
                  </div>
                </div>
                <Button onClick={submitRegistration} disabled={!registrationForm.team_name.trim()} loading={activeAction === 'submit-registration'} loadingText="Submitting registration...">Submit registration</Button>
              </CardContent>
            </Card>
          )}
        </div>

        {activeTournament && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-primary" /> Registrations</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {activeRegistrations.map((registration) => (
                <div key={registration.registration_id} className="rounded-[1.35rem] border p-4 space-y-3 bg-white/70">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold">{registration.team_name}</p>
                      <p className="text-sm text-muted-foreground">Submitted by {registration.submitted_by_name} · {registration.contact_email}</p>
                      <p className="text-xs text-muted-foreground">{getRegistrationOwner(registration.status)}{registration.reviewed_by ? ` · handled by ${registration.reviewed_by}` : ''}</p>
                    </div>
                    <Badge variant={registration.status === 'approved' ? 'default' : registration.status === 'rejected' ? 'destructive' : 'secondary'}>{registration.status}</Badge>
                  </div>
                  <p className="text-sm">Players: {(JSON.parse(registration.players_json) as string[]).join(', ') || '—'}</p>
                  {registration.review_notes && <p className="text-sm text-muted-foreground"><strong>Review note:</strong> {registration.review_notes}</p>}
                  {canApproveTournamentRegistration(user) && (
                    <div className="space-y-2">
                      <Textarea placeholder="Review note" value={reviewNotes[registration.registration_id] || ''} onChange={(e) => setReviewNotes((prev) => ({ ...prev, [registration.registration_id]: e.target.value }))} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => reviewRegistration(registration.registration_id, 'approved')} loading={activeAction === `approved-${registration.registration_id}`} loadingText="Approving...">Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => reviewRegistration(registration.registration_id, 'rejected')} loading={activeAction === `rejected-${registration.registration_id}`} loadingText="Rejecting...">Reject</Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {activeRegistrations.length === 0 && <p className="text-sm text-muted-foreground">No registrations submitted yet.</p>}
            </CardContent>
          </Card>
        )}

        {activeTournament && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Workflow className="h-5 w-5 text-primary" /> Schedule versions & workflow</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {canManageTournament(user) && (
                <div className="rounded-[1.5rem] border p-4 space-y-3 bg-primary/5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">Create new schedule version</p>
                    <Badge variant="outline">Version owner: Tournament Director</Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Linked season</Label>
                      <Select value={scheduleSeasonId || '__none'} onValueChange={(value) => setScheduleSeasonId(value === '__none' ? '' : value)}>
                        <SelectTrigger><SelectValue placeholder="Optional season link" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">No linked season</SelectItem>
                          {seasonsForActiveTournament.map((season) => <SelectItem key={season.season_id} value={season.season_id}>{season.year} · {season.status}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="rounded-2xl border border-primary/10 bg-white/80 p-3 text-sm text-muted-foreground">
                      {scheduleSeasonId ? `This schedule draft will be stored against season ${scheduleSeasonId}.` : 'This schedule draft is not linked to a season yet.'}
                    </div>
                  </div>
                  <Textarea placeholder="Change log" value={changeLog} onChange={(e) => setChangeLog(e.target.value)} />
                  {scheduleDraft.map((match, index) => (
                    <div key={index} className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
                      {(['match_id', 'date', 'time', 'venue', 'team_a', 'team_b', 'stage', 'notes'] as Array<keyof ScheduleMatch>).map((field) => (
                        <Input key={field} placeholder={field.replace(/_/g, ' ')} value={match[field]} onChange={(e) => updateScheduleDraft(index, field, e.target.value)} />
                      ))}
                    </div>
                  ))}
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={() => setScheduleDraft((prev) => [...prev, { ...EMPTY_MATCH }])}>Add match</Button>
                    <Button onClick={createScheduleVersion} loading={activeAction === 'create-schedule'} loadingText="Saving version...">Save version</Button>
                  </div>
                </div>
              )}

              {activeSchedules.map((schedule) => {
                const previous = activeSchedules.find((item) => item.schedule_id === schedule.parent_schedule_id);
                const diff = scheduleService.diffVersions(previous, schedule);
                const approvals = scheduleService.getApprovals().filter((item) => item.schedule_id === schedule.schedule_id);
                return (
                  <div key={schedule.schedule_id} className="rounded-[1.45rem] border p-4 space-y-3 bg-white/70">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-semibold">Version {schedule.version_number}</p>
                        <p className="text-sm text-muted-foreground">{schedule.timestamp}</p>
                        <p className="text-xs text-muted-foreground">{schedule.season_id ? `Season link: ${schedule.season_id}${schedule.season_label ? ` (${schedule.season_label})` : ''}` : 'Season link pending'}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant={schedule.status === 'approved' ? 'default' : schedule.status === 'rejected' ? 'destructive' : 'secondary'}>{schedule.status}</Badge>
                        <Badge variant="outline">Hash {schedule.hash.slice(0, 12)}…</Badge>
                      </div>
                    </div>
                    <p className="text-sm"><strong>Change log:</strong> {schedule.change_log || '—'}</p>
                    <p className="text-sm text-muted-foreground"><strong>Workflow:</strong> {getScheduleDetailedStatus(schedule, approvals)}</p>
                    <div className="space-y-2">
                      {diff.map((entry) => (
                        <div key={entry.match_id} className={`rounded-[1rem] border p-2 text-sm ${entry.kind === 'added' ? 'bg-emerald-500/10 border-emerald-500/30' : entry.kind === 'updated' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                          {entry.kind.toUpperCase()} · {entry.current?.team_a || entry.previous?.team_a} vs {entry.current?.team_b || entry.previous?.team_b}
                        </div>
                      ))}
                      {diff.length === 0 && <p className="text-sm text-muted-foreground">Baseline version.</p>}
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      {approvals.filter((item) => item.decision === 'approved').length > 0 ? approvals.filter((item) => item.decision === 'approved').map((item) => (
                        <Badge key={item.approval_id} variant="outline"><CheckCircle2 className="h-3.5 w-3.5" /> {item.approver_role}</Badge>
                      )) : <Badge variant="secondary"><Clock3 className="h-3.5 w-3.5" /> Awaiting approvers</Badge>}
                    </div>
                    <Textarea placeholder="Approval or rejection note" value={approvalComments[schedule.schedule_id] || ''} onChange={(e) => setApprovalComments((prev) => ({ ...prev, [schedule.schedule_id]: e.target.value }))} />
                    <div className="flex gap-2 flex-wrap">
                      {canManageTournament(user) && schedule.status === 'draft' && <Button variant="outline" onClick={() => submitScheduleForApproval(schedule.schedule_id)} loading={activeAction === `submit-${schedule.schedule_id}`} loadingText="Submitting...">Send for approval</Button>}
                      <Button variant="outline" onClick={() => scheduleService.downloadPdf(schedule.schedule_id)} disabled={schedule.status !== 'approved'}>PDF</Button>
                      <Button onClick={() => decideSchedule(schedule.schedule_id, 'approved')} disabled={schedule.status !== 'pending_approval'} loading={activeAction === `approved-${schedule.schedule_id}`} loadingText="Approving...">Approve</Button>
                      <Button variant="destructive" onClick={() => decideSchedule(schedule.schedule_id, 'rejected')} disabled={schedule.status !== 'pending_approval'} loading={activeAction === `rejected-${schedule.schedule_id}`} loadingText="Rejecting...">Reject</Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TournamentsHubPage;

import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Calendar, ExternalLink, Link2, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
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
import { RegistrationRecord, TournamentRegistryRecord } from './types';

const emptyScheduleRow: ScheduleMatch = { match_id: '', date: '', time: '', venue: '', team_a: '', team_b: '', stage: 'League', notes: '' };
const emptyTournamentForm = { name: '', format: 'T20', venue: '', start_date: '', end_date: '', registration_deadline: '', notes: '', season_year: String(new Date().getFullYear()) };
const emptyRegistrationForm = { team_name: '', contact_name: '', contact_email: '', contact_phone: '', players: '' };

type RegistrationTarget = {
  key: string;
  tournament_id: string;
  season_id: string;
  season_year: number | string;
  tournament_name: string;
  format: string;
  venue: string;
  publicPath: string;
  source_type: 'existing' | 'custom';
  registryRecord?: TournamentRegistryRecord;
};

const parsePlayers = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean);

const TournamentsHubPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { tournaments: catalogTournaments, seasons } = useData();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTargetKey, setSelectedTargetKey] = useState('');
  const [mode, setMode] = useState<'link' | 'create'>('link');
  const [tournamentForm, setTournamentForm] = useState(emptyTournamentForm);
  const [registrationForm, setRegistrationForm] = useState(emptyRegistrationForm);
  const [editingTournament, setEditingTournament] = useState<TournamentRegistryRecord | null>(null);
  const [editingRegistrationId, setEditingRegistrationId] = useState<string | null>(null);
  const [draftRegistration, setDraftRegistration] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [approvalComments, setApprovalComments] = useState<Record<string, string>>({});
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleMatch[]>([emptyScheduleRow]);
  const [changeLog, setChangeLog] = useState('');
  const [linkedSeasonKey, setLinkedSeasonKey] = useState('');

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
          registryRecord: registryTournaments.find((item) => normalizeId(item.tournament_id) === normalizeId(tournament.tournament_id) && normalizeId(item.season_id) === normalizeId(season.season_id)),
        } : null;
      })
      .filter(Boolean) as RegistrationTarget[],
  [catalogTournaments, seasons, registryTournaments]);

  const customTournamentOptions = useMemo(() => registryTournaments
    .filter((item) => item.source_type !== 'existing')
    .map((item) => ({
      key: `${item.tournament_id}::${item.season_id || 'NA'}`,
      tournament_id: item.tournament_id,
      season_id: item.season_id || '',
      season_year: item.season_year || '',
      tournament_name: item.name,
      format: item.format,
      venue: item.venue,
      publicPath: item.public_page_path || `/tournaments/registration/${item.tournament_id}`,
      source_type: 'custom' as const,
      registryRecord: item,
    })), [registryTournaments]);

  const registrationTargets = [...existingSeasonOptions, ...customTournamentOptions];
  const activeTarget = registrationTargets.find((item) => item.key === selectedTargetKey) || registrationTargets[0];

  useEffect(() => {
    if (activeTarget) setSelectedTargetKey(activeTarget.key);
  }, [activeTarget?.key]);

  const activeRegistrations = registrations.filter((item) => normalizeId(item.tournament_id) === normalizeId(activeTarget?.tournament_id) && normalizeId(item.season_id) === normalizeId(activeTarget?.season_id));
  const approvedSchedules = activeTarget ? scheduleService.getApprovedSchedulesForTournament(activeTarget.tournament_id) : [];
  const linkedRecord = activeTarget?.registryRecord;

  const linkedSeasonCandidates = existingSeasonOptions.filter((item) => !item.registryRecord);

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
    setTournamentForm(emptyTournamentForm);
    setSelectedTargetKey(`${record.tournament_id}::NA`);
    setRefreshKey((value) => value + 1);
    toast({ title: 'Tournament registration page created', description: 'This new competition now has its own dedicated registration page.' });
  };

  const linkExistingSeason = async () => {
    if (!user || !canManageTournament(user) || !linkedSeasonKey) return;
    const target = existingSeasonOptions.find((item) => item.key === linkedSeasonKey);
    if (!target) return;
    const season = seasons.find((item) => normalizeId(item.season_id) === normalizeId(target.season_id));
    await tournamentService.createTournament({
      name: target.tournament_name,
      format: target.format,
      venue: target.venue,
      start_date: season?.start_date || '',
      end_date: season?.end_date || '',
      registration_deadline: '',
      notes: `Linked registration workflow for ${target.tournament_name} season ${target.season_year}.`,
      created_by: getActorId(user),
      status: 'open',
      season_id: target.season_id,
      season_year: target.season_year,
      source_type: 'existing',
      public_page_path: target.publicPath,
    }, user);
    setLinkedSeasonKey('');
    setSelectedTargetKey(target.key);
    setRefreshKey((value) => value + 1);
    toast({ title: 'Existing tournament linked', description: 'This season now has a managed registration workflow and will surface on the tournament page.' });
  };

  const startEditTournament = (record: TournamentRegistryRecord) => {
    setEditingTournament(record);
    setTournamentForm({
      name: record.name,
      format: record.format,
      venue: record.venue,
      start_date: record.start_date,
      end_date: record.end_date,
      registration_deadline: record.registration_deadline,
      notes: record.notes,
      season_year: String(record.season_year || ''),
    });
    setMode('create');
  };

  const saveTournamentEdits = async () => {
    if (!user || !editingTournament) return;
    const updated: TournamentRegistryRecord = {
      ...editingTournament,
      ...tournamentForm,
      season_year: Number(tournamentForm.season_year) || tournamentForm.season_year,
    };
    await tournamentService.updateTournament(updated, user);
    setEditingTournament(null);
    setTournamentForm(emptyTournamentForm);
    setRefreshKey((value) => value + 1);
    toast({ title: 'Registration target updated', description: 'Changes were saved and synced to the sheet.' });
  };

  const deleteTournamentTarget = async (record: TournamentRegistryRecord) => {
    if (!user) return;
    await tournamentService.deleteTournament(record.tournament_id, user);
    setRefreshKey((value) => value + 1);
    toast({ title: 'Registration target deleted', description: 'The target was removed and the change was sent to the sheet.' });
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
        players_json: JSON.stringify(parsePlayers(registrationForm.players)),
        submitted_by: getActorId(user),
        submitted_by_name: getActorName(user),
      }, user);
      setRegistrationForm(emptyRegistrationForm);
      setRefreshKey((value) => value + 1);
      toast({ title: 'Registration submitted', description: 'Your team registration is pending Tournament Director approval.' });
    } catch (error) {
      toast({ title: 'Registration blocked', description: error instanceof Error ? error.message : 'Duplicate registration detected.', variant: 'destructive' });
    }
  };

  const startEditRegistration = (registration: RegistrationRecord) => {
    setEditingRegistrationId(registration.registration_id);
    setDraftRegistration({
      team_name: registration.team_name,
      contact_name: registration.contact_name,
      contact_email: registration.contact_email,
      contact_phone: registration.contact_phone,
      players: (JSON.parse(registration.players_json) as string[]).join('\n'),
      status: registration.status,
      review_notes: registration.review_notes,
    });
  };

  const saveRegistrationEdit = async (registration: RegistrationRecord) => {
    if (!user) return;
    try {
      await tournamentService.updateRegistration({
        ...registration,
        team_name: draftRegistration.team_name || registration.team_name,
        contact_name: draftRegistration.contact_name || registration.contact_name,
        contact_email: draftRegistration.contact_email || registration.contact_email,
        contact_phone: draftRegistration.contact_phone || registration.contact_phone,
        players_json: JSON.stringify(parsePlayers(draftRegistration.players || '')),
        status: (draftRegistration.status as RegistrationRecord['status']) || registration.status,
        review_notes: draftRegistration.review_notes || '',
      }, user);
      setEditingRegistrationId(null);
      setDraftRegistration({});
      setRefreshKey((value) => value + 1);
      toast({ title: 'Registration updated', description: 'The row was modified from the UI and synced to the sheet.' });
    } catch (error) {
      toast({ title: 'Could not update registration', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    }
  };

  const removeRegistration = async (registrationId: string) => {
    if (!user) return;
    await tournamentService.deleteRegistration(registrationId, user);
    setRefreshKey((value) => value + 1);
    toast({ title: 'Registration deleted', description: 'The row was removed from the UI and the sheet.' });
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
            <p className="text-muted-foreground">Link existing tournament seasons or create a brand-new tournament page, then manage registrations and schedules from one cleaner admin workspace.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {tournamentService.getTables().map((table) => <Badge key={table} variant="outline">Table: {table}</Badge>)}
            {scheduleService.getTables().map((table) => <Badge key={table} variant="outline">Table: {table}</Badge>)}
          </div>
        </div>

        {canManageTournament(user) && (
          <Card>
            <CardHeader>
              <CardTitle>Admin setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex gap-2 flex-wrap">
                <Button variant={mode === 'link' ? 'default' : 'outline'} onClick={() => setMode('link')}>Link existing season</Button>
                <Button variant={mode === 'create' ? 'default' : 'outline'} onClick={() => setMode('create')}>Create new tournament page</Button>
              </div>

              {mode === 'link' ? (
                <div className="grid gap-3 md:grid-cols-[1fr_auto] items-end">
                  <div className="space-y-2">
                    <Label>Choose an existing tournament season</Label>
                    <select className="h-10 rounded-md border bg-background px-3 text-sm" value={linkedSeasonKey} onChange={(e) => setLinkedSeasonKey(e.target.value)}>
                      <option value="">Select a season to link</option>
                      {linkedSeasonCandidates.map((item) => (
                        <option key={item.key} value={item.key}>{item.tournament_name} • Season {item.season_year}</option>
                      ))}
                    </select>
                  </div>
                  <Button onClick={linkExistingSeason} disabled={!linkedSeasonKey}><Link2 className="h-4 w-4 mr-1" /> Link season</Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(tournamentForm).map(([key, value]) => (
                    <div key={key} className={`space-y-2 ${key === 'notes' ? 'md:col-span-2' : ''}`}>
                      <Label>{key.replace(/_/g, ' ')}</Label>
                      {key === 'notes'
                        ? <Textarea value={value} onChange={(e) => setTournamentForm((prev) => ({ ...prev, [key]: e.target.value }))} />
                        : <Input type={key.includes('date') ? 'date' : key === 'season_year' ? 'number' : 'text'} value={value} onChange={(e) => setTournamentForm((prev) => ({ ...prev, [key]: e.target.value }))} />}
                    </div>
                  ))}
                  <Button onClick={editingTournament ? saveTournamentEdits : createTournament} disabled={!tournamentForm.name.trim()}>
                    {editingTournament ? 'Save tournament target' : 'Create registration page'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
          <Card>
            <CardHeader><CardTitle>Registration targets</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {registrationTargets.length === 0 && <p className="text-sm text-muted-foreground">No tournament seasons are available for registration yet.</p>}
              {registrationTargets.map((item) => {
                const isActive = activeTarget?.key === item.key;
                const targetRegistrations = registrations.filter((registration) => normalizeId(registration.tournament_id) === normalizeId(item.tournament_id) && normalizeId(registration.season_id) === normalizeId(item.season_id));
                const targetSchedules = scheduleService.getApprovedSchedulesForTournament(item.tournament_id);
                return (
                  <button key={item.key} className={`w-full rounded-lg border p-4 text-left ${isActive ? 'border-primary bg-primary/5' : ''}`} onClick={() => setSelectedTargetKey(item.key)}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold">{item.tournament_name}</p>
                        <p className="text-sm text-muted-foreground">Season {item.season_year || 'Open'} • {item.format}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.source_type === 'existing' ? 'Linked to official tournament page' : 'Separate registration-only tournament page'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={item.source_type === 'existing' ? 'outline' : 'default'}>{item.source_type}</Badge>
                        <Badge variant="secondary">{targetRegistrations.length} registration(s)</Badge>
                        <Badge variant="outline">{targetSchedules.length} approved schedule(s)</Badge>
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
                    <Badge variant={linkedRecord?.status === 'open' ? 'default' : 'secondary'}>{linkedRecord?.status || 'not linked yet'}</Badge>
                  </div>
                  <p><strong>Public page:</strong> <Link className="text-primary inline-flex items-center gap-1" to={activeTarget.publicPath}><Link2 className="h-3.5 w-3.5" /> Open linked page</Link></p>
                  <p><strong>Approved schedule versions:</strong> {approvedSchedules.length}</p>
                  <p className="text-muted-foreground">Duplicate team registrations for the same tournament season are blocked, and admins can edit or delete registrations directly from this page.</p>
                  {linkedRecord && canManageTournament(user) && (
                    <div className="flex gap-2 flex-wrap pt-2">
                      <Button size="sm" variant="outline" onClick={() => startEditTournament(linkedRecord)}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit target</Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteTournamentTarget(linkedRecord)}><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete target</Button>
                    </div>
                  )}
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
              {activeRegistrations.map((registration) => {
                const isEditing = editingRegistrationId === registration.registration_id;
                return (
                  <div key={registration.registration_id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-semibold">{registration.team_name}</p>
                        <p className="text-sm text-muted-foreground">Season {registration.season_year || 'Open'} · Submitted by {registration.submitted_by_name} · {registration.contact_email}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant={registration.status === 'approved' ? 'default' : registration.status === 'rejected' ? 'destructive' : 'secondary'}>{registration.status}</Badge>
                        <Button size="sm" variant="outline" onClick={() => isEditing ? setEditingRegistrationId(null) : startEditRegistration(registration)}>{isEditing ? 'Cancel' : 'Edit'}</Button>
                        <Button size="sm" variant="destructive" onClick={() => removeRegistration(registration.registration_id)}>Delete</Button>
                      </div>
                    </div>
                    {isEditing ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Team name</Label>
                          <Input value={draftRegistration.team_name || ''} onChange={(e) => setDraftRegistration((prev) => ({ ...prev, team_name: e.target.value }))} />
                          <Label>Contact name</Label>
                          <Input value={draftRegistration.contact_name || ''} onChange={(e) => setDraftRegistration((prev) => ({ ...prev, contact_name: e.target.value }))} />
                          <Label>Contact email</Label>
                          <Input value={draftRegistration.contact_email || ''} onChange={(e) => setDraftRegistration((prev) => ({ ...prev, contact_email: e.target.value }))} />
                          <Label>Contact phone</Label>
                          <Input value={draftRegistration.contact_phone || ''} onChange={(e) => setDraftRegistration((prev) => ({ ...prev, contact_phone: e.target.value }))} />
                          <Label>Status</Label>
                          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={draftRegistration.status || 'pending'} onChange={(e) => setDraftRegistration((prev) => ({ ...prev, status: e.target.value }))}>
                            <option value="pending">pending</option>
                            <option value="approved">approved</option>
                            <option value="rejected">rejected</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>Players</Label>
                          <Textarea className="min-h-[160px]" value={draftRegistration.players || ''} onChange={(e) => setDraftRegistration((prev) => ({ ...prev, players: e.target.value }))} />
                          <Label>Review notes</Label>
                          <Textarea value={draftRegistration.review_notes || ''} onChange={(e) => setDraftRegistration((prev) => ({ ...prev, review_notes: e.target.value }))} />
                          <Button onClick={() => saveRegistrationEdit(registration)}><Plus className="h-4 w-4 mr-1" /> Save changes</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm">Players: {(JSON.parse(registration.players_json) as string[]).join(', ') || '—'}</p>
                        {!!registration.review_notes && <p className="text-sm text-muted-foreground"><strong>Review note:</strong> {registration.review_notes}</p>}
                      </>
                    )}
                    {canApproveTournamentRegistration(user) && !isEditing && (
                      <div className="space-y-2">
                        <Textarea placeholder="Review note" value={reviewNotes[registration.registration_id] || ''} onChange={(e) => setReviewNotes((prev) => ({ ...prev, [registration.registration_id]: e.target.value }))} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => reviewRegistration(registration.registration_id, 'approved')}>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => reviewRegistration(registration.registration_id, 'rejected')}>Reject</Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
            {registrationTargets.map((item) => (
              <div key={item.key} className="rounded-lg border p-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.tournament_name}</p>
                  <p className="text-sm text-muted-foreground">Season {item.season_year || 'Open'} · {item.source_type === 'existing' ? 'official tournament page' : 'separate registration page'}</p>
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

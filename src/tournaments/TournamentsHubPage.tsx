import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
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

const TournamentsHubPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [tournamentForm, setTournamentForm] = useState({ name: '', format: 'T20', venue: '', start_date: '', end_date: '', registration_deadline: '', notes: '' });
  const [registrationForm, setRegistrationForm] = useState({ team_name: '', contact_name: '', contact_email: '', contact_phone: '', players: '' });
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [approvalComments, setApprovalComments] = useState<Record<string, string>>({});
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleMatch[]>([{ match_id: '', date: '', time: '', venue: '', team_a: '', team_b: '', stage: 'League', notes: '' }]);
  const [changeLog, setChangeLog] = useState('');

  if (!user) return <Navigate to="/login" replace />;

  const tournaments = useMemo(() => tournamentService.getTournaments(), [refreshKey]);
  const registrations = useMemo(() => tournamentService.getRegistrations(), [refreshKey]);
  const activeTournament = tournaments.find((item) => item.tournament_id === selectedTournament) || tournaments[0];
  const activeRegistrations = registrations.filter((item) => item.tournament_id === activeTournament?.tournament_id);
  const approvedSchedules = activeTournament ? scheduleService.getApprovedSchedulesForTournament(activeTournament.tournament_id) : [];

  const createTournament = () => {
    if (!user || !canManageTournament(user)) return;
    const record = tournamentService.createTournament({ ...tournamentForm, created_by: getActorId(user), status: 'open' }, user);
    setSelectedTournament(record.tournament_id);
    setTournamentForm({ name: '', format: 'T20', venue: '', start_date: '', end_date: '', registration_deadline: '', notes: '' });
    setRefreshKey((value) => value + 1);
    toast({ title: 'Tournament created', description: 'Registration is now open for members.' });
  };

  const submitRegistration = () => {
    if (!activeTournament || !user) return;
    tournamentService.submitRegistration({
      tournament_id: activeTournament.tournament_id,
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
  };


  const createScheduleVersion = async () => {
    if (!activeTournament || !user || !canManageTournament(user)) return;
    await scheduleService.createVersion({
      tournament_id: activeTournament.tournament_id,
      tournament_name: activeTournament.name,
      matches: scheduleDraft.filter((item) => item.match_id && item.team_a && item.team_b),
      change_log: changeLog,
    }, user);
    setScheduleDraft([{ match_id: '', date: '', time: '', venue: '', team_a: '', team_b: '', stage: 'League', notes: '' }]);
    setChangeLog('');
    setRefreshKey((value) => value + 1);
    toast({ title: 'Schedule draft saved', description: 'A new version has been created and previous versions remain archived.' });
  };

  const updateScheduleDraft = (index: number, field: keyof ScheduleMatch, value: string) => {
    setScheduleDraft((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  };

  const submitScheduleForApproval = (scheduleId: string) => {
    if (!user) return;
    scheduleService.submitForApproval(scheduleId, user);
    setRefreshKey((value) => value + 1);
    toast({ title: 'Sent for approval', description: 'The office bearer approval workflow has started.' });
  };

  const decideSchedule = (scheduleId: string, decision: 'approved' | 'rejected') => {
    if (!user) return;
    try {
      if (decision === 'approved') scheduleService.approveSchedule(scheduleId, approvalComments[scheduleId] || '', user);
      else scheduleService.rejectSchedule(scheduleId, approvalComments[scheduleId] || '', user);
      setRefreshKey((value) => value + 1);
      toast({ title: `Schedule ${decision}`, description: decision === 'approved' ? 'Your approval has been recorded.' : 'The version moved back to draft.' });
    } catch (error) {
      toast({ title: 'Schedule review failed', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    }
  };

  const reviewRegistration = (registrationId: string, status: 'approved' | 'rejected') => {
    if (!user || !canApproveTournamentRegistration(user)) return;
    tournamentService.reviewRegistration(registrationId, status, reviewNotes[registrationId] || '', user);
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
            <p className="text-muted-foreground">Create tournaments, register teams, review approvals, and monitor approved schedule versions.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {tournamentService.getTables().map((table) => <Badge key={table} variant="outline">Table: {table}</Badge>)}
            {scheduleService.getTables().map((table) => <Badge key={table} variant="outline">Table: {table}</Badge>)}
          </div>
        </div>

        {canManageTournament(user) && (
          <Card>
            <CardHeader><CardTitle>Create Tournament</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {Object.entries(tournamentForm).map(([key, value]) => (
                <div key={key} className={`space-y-2 ${key === 'notes' ? 'md:col-span-2' : ''}`}>
                  <Label>{key.replace(/_/g, ' ')}</Label>
                  {key === 'notes'
                    ? <Textarea value={value} onChange={(e) => setTournamentForm((prev) => ({ ...prev, [key]: e.target.value }))} />
                    : <Input type={key.includes('date') ? 'date' : 'text'} value={value} onChange={(e) => setTournamentForm((prev) => ({ ...prev, [key]: e.target.value }))} />}
                </div>
              ))}
              <Button onClick={createTournament} disabled={!tournamentForm.name.trim()}>Create Tournament</Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
          <Card>
            <CardHeader><CardTitle>Available Tournaments</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {tournaments.length === 0 && <p className="text-sm text-muted-foreground">No tournament registry records yet.</p>}
              {tournaments.map((item) => (
                <button key={item.tournament_id} className={`w-full rounded-lg border p-4 text-left ${activeTournament?.tournament_id === item.tournament_id ? 'border-primary bg-primary/5' : ''}`} onClick={() => setSelectedTournament(item.tournament_id)}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.format} · {item.venue}</p>
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
                <div className="rounded-lg border p-4 text-sm space-y-1">
                  <p><strong>Dates:</strong> {activeTournament.start_date} → {activeTournament.end_date}</p>
                  <p><strong>Registration deadline:</strong> {activeTournament.registration_deadline || 'Not set'}</p>
                  <p><strong>Notes:</strong> {activeTournament.notes || '—'}</p>
                  <p><strong>Approved schedule versions:</strong> {approvedSchedules.length}</p>
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
                <Button onClick={submitRegistration} disabled={!registrationForm.team_name.trim()}>Submit Registration</Button>
              </CardContent>
            </Card>
          )}
        </div>

        {activeTournament && (
          <Card>
            <CardHeader><CardTitle>Registrations</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {activeRegistrations.map((registration) => (
                <div key={registration.registration_id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold">{registration.team_name}</p>
                      <p className="text-sm text-muted-foreground">Submitted by {registration.submitted_by_name} · {registration.contact_email}</p>
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


        {activeTournament && (
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
                    <Button variant="outline" onClick={() => setScheduleDraft((prev) => [...prev, { match_id: '', date: '', time: '', venue: '', team_a: '', team_b: '', stage: 'League', notes: '' }])}>Add Match</Button>
                    <Button onClick={createScheduleVersion}>Save Version</Button>
                  </div>
                </div>
              )}

              {[...scheduleService.getSchedules().filter((item) => item.tournament_id === activeTournament.tournament_id)].sort((a, b) => b.version_number - a.version_number).map((schedule) => {
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

      </div>
    </div>
  );
};

export default TournamentsHubPage;

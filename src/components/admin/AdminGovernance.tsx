import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth';
import { canManageTournament, getActorId } from '@/lib/accessControl';
import { scheduleService } from '@/schedules/scheduleService';
import { ScheduleFormat, ScheduleGenerationPolicy, ScheduleMatch } from '@/schedules/types';
import { tournamentService } from '@/tournaments/tournamentService';
import { useToast } from '@/hooks/use-toast';
import { getScheduleApprovalRoadmap, getScheduleDetailedStatus } from '@/lib/workflowStatus';
import { formatInIST } from '@/lib/time';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { generateTournamentSchedule } from '@/schedules/scheduleGenerator';
import { v2api } from '@/lib/v2api';
import { TeamProfile } from '@/lib/v2types';

const defaultPolicy: ScheduleGenerationPolicy = {
  format: 'round_robin',
  start_date: '',
  end_date: '',
  matches_per_day: 2,
  match_times: ['09:00', '14:00'],
  allow_same_day_multiple_matches: false,
  allow_consecutive_days: false,
  venues: ['Main Ground'],
  selected_teams: [],
};

const FORMAT_OPTIONS: Array<{ value: ScheduleFormat; label: string }> = [
  { value: 'round_robin', label: 'Round Robin' },
  { value: 'double_round_robin', label: 'Double Round Robin' },
  { value: 'single_elimination', label: 'Single Elimination' },
  { value: 'double_elimination', label: 'Double Elimination' },
];

export function AdminGovernance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [tournamentId, setTournamentId] = useState('');
  const [tournamentName, setTournamentName] = useState('');
  const [changeLog, setChangeLog] = useState('');
  const [policy, setPolicy] = useState<ScheduleGenerationPolicy>(defaultPolicy);
  const [matches, setMatches] = useState<ScheduleMatch[]>([]);
  const [expandedSchedules, setExpandedSchedules] = useState<Record<string, boolean>>({});
  const [teamProfiles, setTeamProfiles] = useState<TeamProfile[]>([]);
  const [certificationNote, setCertificationNote] = useState('Officially certified for season release.');

  const loadGovernanceData = useCallback(async () => {
    await Promise.all([
      scheduleService.syncFromBackend(),
      tournamentService.syncFromBackend(),
      v2api.getTeamProfiles().then((rows) => {
        const activeProfiles = rows
          .filter((row) => String(row.status || '').trim().toLowerCase() !== 'inactive' && !!String(row.team_name || '').trim())
          .sort((a, b) => String(a.team_name || '').localeCompare(String(b.team_name || '')));
        setTeamProfiles(activeProfiles);
      }),
    ]);
    setRefreshKey((value) => value + 1);
  }, []);

  useEffect(() => {
    void loadGovernanceData();
    const intervalId = window.setInterval(() => {
      void loadGovernanceData();
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [loadGovernanceData]);

  const schedules = useMemo(() => scheduleService.getSchedules(), [refreshKey]);
  const approvals = useMemo(() => scheduleService.getApprovals(), [refreshKey]);
  const tournamentOptions = useMemo(() => tournamentService.getTournaments(), [refreshKey]);

  const selectedTeams = useMemo(() => teamProfiles.filter((team) => policy.selected_teams.includes(team.team_name)), [policy.selected_teams, teamProfiles]);

  const updatePolicy = <K extends keyof ScheduleGenerationPolicy>(key: K, value: ScheduleGenerationPolicy[K]) => {
    setPolicy((prev) => ({ ...prev, [key]: value }));
  };

  const toggleTeam = (teamName: string, checked: boolean) => {
    setPolicy((prev) => ({
      ...prev,
      selected_teams: checked
        ? [...prev.selected_teams, teamName]
        : prev.selected_teams.filter((name) => name !== teamName),
    }));
  };

  const regenerate = () => {
    if (!tournamentName || policy.selected_teams.length < 2 || !policy.start_date || !policy.end_date) {
      toast({ title: 'Missing inputs', description: 'Choose tournament, date range and at least 2 active teams.', variant: 'destructive' });
      return;
    }

    const generatedMatches = generateTournamentSchedule({
      tournamentName,
      teams: policy.selected_teams,
      policy,
    });

    if (!generatedMatches.length) {
      toast({ title: 'Unable to generate', description: 'No slots available with current rules. Increase date range, time slots, or allow back-to-back/same-day play.', variant: 'destructive' });
      return;
    }

    setMatches(generatedMatches);
    toast({ title: 'Schedule generated', description: `${generatedMatches.length} matches generated with secure release-ready metadata.` });
  };

  const addScheduleVersion = async () => {
    if (!user || !canManageTournament(user) || !tournamentId || !tournamentName) return;
    await scheduleService.createVersion({
      tournament_id: tournamentId,
      tournament_name: tournamentName,
      matches,
      change_log: changeLog || `Auto-generated ${policy.format} schedule with ${policy.selected_teams.length} teams.`,
      policy,
    }, user);
    setMatches([]);
    setChangeLog('');
    setRefreshKey((value) => value + 1);
    toast({ title: 'Schedule version created', description: 'A new draft schedule version has been saved with version ID and timestamp.' });
  };

  const visibleSchedules = useMemo(() => {
    const latestByTournament = new Map<string, typeof schedules[number]>();
    [...schedules]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .forEach((schedule) => {
        if (!latestByTournament.has(schedule.tournament_id)) latestByTournament.set(schedule.tournament_id, schedule);
      });
    return [...latestByTournament.values()];
  }, [schedules]);

  if (!canManageTournament(user)) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Only admin and tournament director can access the tournament schedule generator.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Tournament Schedule Studio (Admin + Tournament Director)</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Tournament ID</Label>
              <Input placeholder="Tournament ID" value={tournamentId} onChange={(e) => setTournamentId(e.target.value)} list="governance-tournaments" />
              <datalist id="governance-tournaments">
                {tournamentOptions.map((item) => <option key={item.tournament_id} value={item.tournament_id}>{item.name}</option>)}
              </datalist>
            </div>
            <div>
              <Label>Tournament Name</Label>
              <Input placeholder="Tournament name" value={tournamentName} onChange={(e) => setTournamentName(e.target.value)} />
            </div>
            <div>
              <Label>Format</Label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={policy.format} onChange={(e) => updatePolicy('format', e.target.value as ScheduleFormat)}>
                {FORMAT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Matches per day</Label>
              <Input type="number" min={1} max={10} value={policy.matches_per_day} onChange={(e) => updatePolicy('matches_per_day', Math.max(1, Number(e.target.value) || 1))} />
            </div>
            <div>
              <Label>Start date</Label>
              <Input type="date" value={policy.start_date} onChange={(e) => updatePolicy('start_date', e.target.value)} />
            </div>
            <div>
              <Label>End date</Label>
              <Input type="date" value={policy.end_date} onChange={(e) => updatePolicy('end_date', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Match timings (comma separated, HH:mm)</Label>
              <Input value={policy.match_times.join(', ')} onChange={(e) => updatePolicy('match_times', e.target.value.split(',').map((item) => item.trim()).filter(Boolean))} placeholder="09:00, 14:00, 18:30" />
            </div>
            <div className="md:col-span-2">
              <Label>Venues (comma separated)</Label>
              <Input value={policy.venues.join(', ')} onChange={(e) => updatePolicy('venues', e.target.value.split(',').map((item) => item.trim()).filter(Boolean))} placeholder="Main Ground, City Oval" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={policy.allow_same_day_multiple_matches} onCheckedChange={(checked) => updatePolicy('allow_same_day_multiple_matches', Boolean(checked))} /> Allow team to play two matches in one day</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={policy.allow_consecutive_days} onCheckedChange={(checked) => updatePolicy('allow_consecutive_days', Boolean(checked))} /> Allow team to play on consecutive days</label>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Select active teams</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {teamProfiles.map((team) => {
                const checked = policy.selected_teams.includes(team.team_name);
                return <label key={team.team_id} className="flex items-center gap-2 rounded-lg border p-2 text-sm"><Checkbox checked={checked} onCheckedChange={(value) => toggleTeam(team.team_name, Boolean(value))} />{team.team_name}</label>;
              })}
            </div>
            <p className="text-xs text-muted-foreground">Selected teams: {selectedTeams.length}</p>
          </div>

          <Textarea placeholder="Change log for this version" value={changeLog} onChange={(e) => setChangeLog(e.target.value)} />

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={regenerate}>Generate Digital Schedule</Button>
            <Button onClick={addScheduleVersion} disabled={!matches.length}>Save as New Version</Button>
          </div>

          {!!matches.length && (
            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm font-medium">Generated fixture preview ({matches.length} matches)</p>
              <div className="max-h-72 overflow-auto space-y-2">
                {matches.map((match) => <div key={match.match_id} className="rounded border p-2 text-sm">{match.date} {match.time} · {match.team_a} vs {match.team_b} · {match.venue}</div>)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Version control, approvals, and certification release</CardTitle>
          <p className="text-sm text-muted-foreground">Latest active schedule per tournament with certification and release traceability.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {visibleSchedules.map((schedule) => {
            const scheduleApprovals = approvals.filter((item) => item.schedule_id === schedule.schedule_id);
            const previous = schedules.find((item) => item.schedule_id === schedule.parent_schedule_id);
            const diff = scheduleService.diffVersions(previous, schedule);
            const roadmap = getScheduleApprovalRoadmap(schedule, approvals);
            const detailedStatus = getScheduleDetailedStatus(schedule, approvals);
            const isExpanded = expandedSchedules[schedule.schedule_id] ?? false;

            return (
              <div key={schedule.schedule_id} className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-semibold">{schedule.tournament_name} · v{schedule.version_number}</p>
                    <p className="text-sm text-muted-foreground">Release ID {schedule.schedule_id} · Created by {schedule.created_by_name} ({schedule.created_by || getActorId(user)})</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge>{detailedStatus}</Badge>
                    <Badge variant="outline">Hash {schedule.hash.slice(0, 10)}…</Badge>
                    <Button size="sm" variant="outline" onClick={() => setExpandedSchedules((prev) => ({ ...prev, [schedule.schedule_id]: !isExpanded }))}>
                      {isExpanded ? <>Hide details <ChevronUp className="ml-1 h-4 w-4" /></> : <>Show details <ChevronDown className="ml-1 h-4 w-4" /></>}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <>
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                      <p><strong>Current status:</strong> {detailedStatus}</p>
                      <p><strong>Timestamp:</strong> {formatInIST(schedule.timestamp)}</p>
                      <p><strong>Change log:</strong> {schedule.change_log || 'No change log'}</p>
                      {schedule.certified_by_name && <p><strong>Certified release:</strong> {schedule.certified_by_name} at {formatInIST(schedule.certified_at || schedule.timestamp)}</p>}
                      {schedule.rejection_reason && <p><strong>Revision note:</strong> {schedule.rejection_reason}</p>}
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Approval roadmap</p>
                      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                        {roadmap.map((step) => (
                          <div key={step.role} className={`rounded-lg border p-3 ${step.approval?.decision === 'rejected' ? 'border-destructive/30 bg-destructive/5' : step.completed ? 'border-primary/30 bg-primary/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium">{step.role}</p>
                              <Badge variant={step.approval?.decision === 'rejected' ? 'destructive' : step.completed ? 'default' : 'secondary'}>
                                {step.approval?.decision === 'rejected' ? 'Rejected' : step.completed ? 'Approved' : `Pending with ${step.role}`}
                              </Badge>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {step.approval ? `${step.approval.approver_name} • ${formatInIST(step.approval.timestamp)}${step.approval.comments ? ` • ${step.approval.comments}` : ''}` : 'Waiting for this office bearer approval.'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Diff against previous version</p>
                      {diff.map((entry) => (
                        <div key={entry.match_id} className={`rounded border p-2 text-sm ${entry.kind === 'added' ? 'bg-green-500/10 border-green-500/30' : entry.kind === 'updated' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                          <strong>{entry.kind.toUpperCase()}</strong> · {entry.current?.team_a || entry.previous?.team_a} vs {entry.current?.team_b || entry.previous?.team_b}
                        </div>
                      ))}
                      {diff.length === 0 && <p className="text-sm text-muted-foreground">No previous version for comparison.</p>}
                    </div>

                    <div className="flex gap-2 flex-wrap items-center">
                      {schedule.status === 'draft' && (
                        <Button size="sm" variant="outline" onClick={async () => { await scheduleService.submitForApproval(schedule.schedule_id, user!); setRefreshKey((value) => value + 1); }}>Send for Approval</Button>
                      )}
                      <Input className="max-w-md" value={certificationNote} onChange={(e) => setCertificationNote(e.target.value)} placeholder="Certification note" />
                      <Button size="sm" onClick={async () => { await scheduleService.certifySchedule(schedule.schedule_id, certificationNote, user!); setRefreshKey((value) => value + 1); }}>Certify & Release</Button>
                    </div>
                    <div className="text-sm text-muted-foreground">Approvals received: {scheduleApprovals.map((item) => `${item.approver_name} (${item.approver_role})`).join(', ') || 'None yet'}</div>
                  </>
                )}
              </div>
            );
          })}
          {visibleSchedules.length === 0 && <p className="text-sm text-muted-foreground">No schedule versions available yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

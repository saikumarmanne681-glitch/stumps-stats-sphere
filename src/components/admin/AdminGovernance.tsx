import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth';
import { canManageElections, canManageTournament, getActorId } from '@/lib/accessControl';
import { electionService } from '@/elections/electionService';
import { scheduleService } from '@/schedules/scheduleService';
import { ScheduleMatch } from '@/schedules/types';
import { tournamentService } from '@/tournaments/tournamentService';
import { useToast } from '@/hooks/use-toast';
import { getScheduleApprovalRoadmap, getScheduleDetailedStatus } from '@/lib/workflowStatus';

const initialMatch = (): ScheduleMatch => ({ match_id: '', date: '', time: '', venue: '', team_a: '', team_b: '', stage: 'League', notes: '' });

export function AdminGovernance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [tournamentId, setTournamentId] = useState('');
  const [tournamentName, setTournamentName] = useState('');
  const [changeLog, setChangeLog] = useState('');
  const [matches, setMatches] = useState<ScheduleMatch[]>([initialMatch()]);

  useEffect(() => {
    Promise.all([electionService.syncFromBackend(), scheduleService.syncFromBackend(), tournamentService.syncFromBackend()]).finally(() => setRefreshKey((value) => value + 1));
  }, []);

  const elections = useMemo(() => electionService.getElections(), [refreshKey]);
  const schedules = useMemo(() => scheduleService.getSchedules(), [refreshKey]);
  const approvals = useMemo(() => scheduleService.getApprovals(), [refreshKey]);
  const tournamentOptions = useMemo(() => tournamentService.getTournaments(), [refreshKey]);

  const updateMatch = (index: number, field: keyof ScheduleMatch, value: string) => {
    setMatches((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  };

  const addScheduleVersion = async () => {
    if (!user || !canManageTournament(user) || !tournamentId || !tournamentName) return;
    await scheduleService.createVersion({
      tournament_id: tournamentId,
      tournament_name: tournamentName,
      matches: matches.filter((item) => item.match_id && item.team_a && item.team_b),
      change_log: changeLog,
    }, user);
    setMatches([initialMatch()]);
    setChangeLog('');
    setRefreshKey((value) => value + 1);
    toast({ title: 'Schedule version created', description: 'A new draft version has been saved without overwriting prior versions.' });
  };

  const pendingSchedules = schedules.filter((item) => item.status === 'draft' || item.status === 'pending_approval');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Election Control</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total elections</p>
            <p className="font-display text-3xl font-bold">{elections.length}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Can administer</p>
            <p className="font-medium">{canManageElections(user) ? 'Yes — admin only' : 'Admin only'}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Audit source</p>
            <p className="font-medium">Local collections + central audit log</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Schedule Versioning</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input placeholder="Tournament ID" value={tournamentId} onChange={(e) => setTournamentId(e.target.value)} list="governance-tournaments" />
            <Input placeholder="Tournament name" value={tournamentName} onChange={(e) => setTournamentName(e.target.value)} />
            <datalist id="governance-tournaments">
              {tournamentOptions.map((item) => <option key={item.tournament_id} value={item.tournament_id}>{item.name}</option>)}
            </datalist>
          </div>
          <Textarea placeholder="Change log for this version" value={changeLog} onChange={(e) => setChangeLog(e.target.value)} />
          {matches.map((match, index) => (
            <div key={index} className="grid gap-2 rounded-lg border p-4 md:grid-cols-4">
              {(['match_id', 'date', 'time', 'venue', 'team_a', 'team_b', 'stage', 'notes'] as Array<keyof ScheduleMatch>).map((field) => (
                <Input key={field} placeholder={field.replace(/_/g, ' ')} value={match[field]} onChange={(e) => updateMatch(index, field, e.target.value)} />
              ))}
            </div>
          ))}
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setMatches((prev) => [...prev, initialMatch()])}>Add Match</Button>
            <Button onClick={addScheduleVersion} disabled={!canManageTournament(user)}>Save New Version</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Approval roadmap for tournament schedules</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {pendingSchedules.map((schedule) => {
            const scheduleApprovals = approvals.filter((item) => item.schedule_id === schedule.schedule_id);
            const previous = schedules.find((item) => item.schedule_id === schedule.parent_schedule_id);
            const diff = scheduleService.diffVersions(previous, schedule);
            const roadmap = getScheduleApprovalRoadmap(schedule, approvals);
            const detailedStatus = getScheduleDetailedStatus(schedule, approvals);

            return (
              <div key={schedule.schedule_id} className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-semibold">{schedule.tournament_name} · v{schedule.version_number}</p>
                    <p className="text-sm text-muted-foreground">Created by {schedule.created_by_name} ({schedule.created_by || getActorId(user)})</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge>{detailedStatus}</Badge>
                    <Badge variant="outline">Hash {schedule.hash.slice(0, 10)}…</Badge>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                  <p><strong>Current status:</strong> {detailedStatus}</p>
                  <p><strong>Change log:</strong> {schedule.change_log || 'No change log'}</p>
                  {schedule.rejection_reason && <p><strong>Revision note:</strong> {schedule.rejection_reason}</p>}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Approval roadmap</p>
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {roadmap.map((step) => (
                      <div key={step.role} className={`rounded-lg border p-3 ${step.completed ? 'border-primary/30 bg-primary/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{step.role}</p>
                          <Badge variant={step.completed ? 'default' : 'secondary'}>{step.completed ? 'Approved' : `Pending with ${step.role}`}</Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {step.approval ? `${step.approval.approver_name} • ${new Date(step.approval.timestamp).toLocaleString()}` : 'Waiting for this office bearer approval.'}
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

                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={async () => { await scheduleService.submitForApproval(schedule.schedule_id, user!); setRefreshKey((value) => value + 1); }}>Send for Approval</Button>
                </div>
                <div className="text-sm text-muted-foreground">Approvals received: {scheduleApprovals.map((item) => `${item.approver_name} (${item.approver_role})`).join(', ') || 'None yet'}</div>
              </div>
            );
          })}
          {pendingSchedules.length === 0 && <p className="text-sm text-muted-foreground">No draft or pending schedules to review.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/lib/auth';
import { v2api } from '@/lib/v2api';
import { DigitalScorelist, ManagementUser, SupportTicket } from '@/lib/v2types';
import { scheduleService } from '@/schedules/scheduleService';
import { ScheduleApprovalRecord, ScheduleRecord } from '@/schedules/types';
import { getScorelistRoadmap, getScheduleApprovalRoadmap, readScorelistCertifications } from '@/lib/workflowStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatInIST, parseTimestamp } from '@/lib/time';
import { AlertTriangle, CalendarDays, Loader2, UserX } from 'lucide-react';

interface WorkQueueTask {
  id: string;
  source: 'support' | 'scorelist' | 'governance';
  label: string;
  title: string;
  assigneeId: string;
  assigneeLabel: string;
  dueAt: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  escalationState: string;
  status: string;
}

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-destructive/10 text-destructive',
};

function isToday(dateValue?: string) {
  const date = parseTimestamp(dateValue);
  if (!date) return false;
  const now = new Date();
  return date.getUTCFullYear() === now.getUTCFullYear() && date.getUTCMonth() === now.getUTCMonth() && date.getUTCDate() === now.getUTCDate();
}

function isOverdue(dateValue?: string) {
  const date = parseTimestamp(dateValue);
  if (!date) return false;
  return date.getTime() < Date.now();
}

export default function AdminWorkQueuePage() {
  const { isAdmin, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [managementUsers, setManagementUsers] = useState<ManagementUser[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [scorelists, setScorelists] = useState<DigitalScorelist[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [scheduleApprovals, setScheduleApprovals] = useState<ScheduleApprovalRecord[]>([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      await scheduleService.syncFromBackend();
      const [ticketsData, scorelistsData, managementData] = await Promise.all([
        v2api.getTickets(),
        v2api.getScorelists(),
        v2api.getManagementUsers(),
      ]);
      setSupportTickets(ticketsData);
      setScorelists(scorelistsData);
      setManagementUsers(managementData.filter((item) => String(item.status || '').toLowerCase() !== 'inactive'));
      setSchedules(scheduleService.getSchedules());
      setScheduleApprovals(scheduleService.getApprovals());
      setLoading(false);
    };
    run();
  }, []);

  const getMemberLabel = (id: string) => {
    if (!id) return 'Unassigned';
    const member = managementUsers.find((item) => item.management_id === id || item.username === id);
    if (!member) return id;
    return member.designation ? `${member.name} • ${member.designation}` : member.name;
  };

  const tasks = useMemo(() => {
    const list: WorkQueueTask[] = [];

    supportTickets
      .filter((ticket) => ['open', 'in_progress', 'waiting_for_user'].includes(ticket.status))
      .forEach((ticket) => {
        list.push({
          id: ticket.ticket_id,
          source: 'support',
          label: 'Support Ticket',
          title: ticket.subject,
          assigneeId: ticket.assignee_id || ticket.assigned_admin_id || '',
          assigneeLabel: getMemberLabel(ticket.assignee_id || ticket.assigned_admin_id || ''),
          dueAt: ticket.due_at || ticket.resolution_due,
          priority: ticket.priority,
          escalationState: ticket.escalation_state || 'normal',
          status: ticket.status,
        });
      });

    scorelists
      .filter((scorelist) => !scorelist.locked)
      .forEach((scorelist) => {
        const roadmap = getScorelistRoadmap(scorelist, managementUsers);
        const pendingStep = roadmap.find((step) => step.stage !== 'draft' && !step.completed);
        if (!pendingStep) return;
        list.push({
          id: scorelist.scorelist_id,
          source: 'scorelist',
          label: 'Scorelist Approval',
          title: `${pendingStep.label} • ${scorelist.scorelist_id}`,
          assigneeId: scorelist.assignee_id || pendingStep.pendingApprovers[0]?.management_id || '',
          assigneeLabel: scorelist.assignee_id
            ? getMemberLabel(scorelist.assignee_id)
            : (pendingStep.pendingApprovers[0]?.designation || pendingStep.pendingApprovers[0]?.name || 'Unassigned'),
          dueAt: scorelist.due_at || new Date(new Date(scorelist.generated_at || Date.now()).getTime() + 24 * 3600 * 1000).toISOString(),
          priority: scorelist.priority || 'medium',
          escalationState: scorelist.escalation_state || 'normal',
          status: pendingStep.label,
        });
      });

    schedules
      .filter((schedule) => schedule.status === 'pending_approval')
      .forEach((schedule) => {
        const roadmap = getScheduleApprovalRoadmap(schedule, scheduleApprovals);
        const nextRole = roadmap.find((item) => !item.completed)?.role || 'Unassigned';
        list.push({
          id: schedule.schedule_id,
          source: 'governance',
          label: 'Governance Schedule',
          title: `${schedule.tournament_name} • Version ${schedule.version_number}`,
          assigneeId: schedule.assignee_id || '',
          assigneeLabel: schedule.assignee_id ? getMemberLabel(schedule.assignee_id) : `Pending with ${nextRole}`,
          dueAt: schedule.due_at || new Date(new Date(schedule.timestamp || Date.now()).getTime() + 48 * 3600 * 1000).toISOString(),
          priority: schedule.priority || 'high',
          escalationState: schedule.escalation_state || 'normal',
          status: schedule.status,
        });
      });

    return list.sort((a, b) => (parseTimestamp(a.dueAt)?.getTime() || Number.MAX_SAFE_INTEGER) - (parseTimestamp(b.dueAt)?.getTime() || Number.MAX_SAFE_INTEGER));
  }, [supportTickets, scorelists, schedules, scheduleApprovals, managementUsers]);

  const myTasksToday = useMemo(() => {
    const actorId = user?.management_id || user?.username || '';
    return tasks.filter((task) => task.assigneeId && task.assigneeId === actorId && isToday(task.dueAt));
  }, [tasks, user?.management_id, user?.username]);

  const overdueTasks = useMemo(() => tasks.filter((task) => isOverdue(task.dueAt)), [tasks]);
  const unassignedTasks = useMemo(() => tasks.filter((task) => !task.assigneeId), [tasks]);

  if (!isAdmin) return <Navigate to="/login" />;
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Unified Ops Desk</p>
            <h1 className="font-display text-3xl font-bold">🧩 Work Queue</h1>
            <p className="text-sm text-muted-foreground">Pending approvals and operational tasks across scorelists, support, and governance workflows.</p>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()}>Refresh Queue</Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">My tasks due today</p>
              <p className="text-3xl font-bold">{myTasksToday.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Tasks assigned to you due on current UTC date.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Overdue</p>
              <p className="text-3xl font-bold text-destructive">{overdueTasks.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Requires immediate action and escalation review.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Unassigned</p>
              <p className="text-3xl font-bold text-amber-600">{unassignedTasks.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Assign ownership to keep SLA and accountability clear.</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending task ledger ({tasks.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.length === 0 && <p className="text-sm text-muted-foreground">No pending work items.</p>}
            {tasks.map((task) => (
              <div key={`${task.source}:${task.id}`} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{task.title}</p>
                    <p className="text-xs text-muted-foreground font-mono">{task.id}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{task.label}</Badge>
                    <Badge className={PRIORITY_STYLES[task.priority]}>{task.priority}</Badge>
                    {isOverdue(task.dueAt) && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Overdue</Badge>}
                    {!task.assigneeId && <Badge variant="secondary" className="gap-1"><UserX className="h-3 w-3" />Unassigned</Badge>}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Due: {formatInIST(task.dueAt)} IST</span>
                  <span>Assignee: {task.assigneeLabel}</span>
                  <span>Status: {task.status}</span>
                  <span>Escalation: {task.escalationState}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

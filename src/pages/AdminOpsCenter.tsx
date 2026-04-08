import { useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock3, Radio, ShieldAlert, TimerReset } from 'lucide-react';

import { Navbar } from '@/components/Navbar';
import { PendingActionsPanel, type PendingActionItem } from '@/components/PendingActionsPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { canApproveSchedule, canManageTournament, isAdminOrDesignation, managementDesignations } from '@/lib/accessControl';
import { formatInIST, parseTimestamp } from '@/lib/time';
import { useAdminOpsCenterData } from '@/lib/dataHooks';

const STALLED_MINUTES = 10;

function getSeverity(score: number): 'healthy' | 'attention' | 'critical' {
  if (score >= 80) return 'critical';
  if (score >= 35) return 'attention';
  return 'healthy';
}

function minutesAgo(value?: string) {
  const parsed = parseTimestamp(value || '');
  if (!parsed) return null;
  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 60000));
}

const AdminOpsCenter = () => {
  const { user, isAdmin } = useAuth();
  const { data, isLoading, refetch, isFetching } = useAdminOpsCenterData();

  if (!user) return <Navigate to="/login" replace />;

  const canSeeApprovals = isAdmin || canApproveSchedule(user) || canManageTournament(user);
  const canSeeSupport = isAdmin || isAdminOrDesignation(user, managementDesignations.SECRETARY) || isAdminOrDesignation(user, managementDesignations.VICE_PRESIDENT);
  const canSeeLive = isAdmin || canManageTournament(user);

  const liveMatches = useMemo(() => (data?.matches || []).filter((match) => match.status === 'live'), [data?.matches]);

  const pendingApprovals = useMemo(() => {
    if (!data) return [];

    const scorelistItems = data.scorelists.filter((item) => !item.locked && item.certification_status !== 'official_certified');
    const certificateItems = data.certificates.filter((item) => ['PENDING_APPROVAL', 'APPROVED'].includes(item.status));

    const overdueScorelists = scorelistItems.filter((item) => {
      const due = parseTimestamp(item.due_at || item.generated_at);
      return due ? due.getTime() < Date.now() : false;
    });

    return {
      total: scorelistItems.length + certificateItems.length,
      overdue: overdueScorelists.length,
      scorelistItems,
      certificateItems,
    };
  }, [data]);

  const supportQueue = useMemo(() => {
    if (!data) return { unresolved: [], breached: [] as typeof data.tickets };
    const unresolved = data.tickets.filter((ticket) => ['open', 'in_progress', 'waiting_for_user'].includes(ticket.status));
    const breached = unresolved.filter((ticket) => {
      const due = parseTimestamp(ticket.resolution_due || ticket.due_at);
      return due ? due.getTime() < Date.now() : false;
    });
    return { unresolved, breached };
  }, [data]);

  const liveStatus = useMemo(() => {
    if (!data) return { stalled: [], healthy: [] as typeof liveMatches };
    const stalled = liveMatches.filter((match) => {
      const events = data.timeline
        .filter((event) => event.match_id === match.match_id)
        .sort((a, b) => (parseTimestamp(b.timestamp)?.getTime() || 0) - (parseTimestamp(a.timestamp)?.getTime() || 0));
      const lastUpdate = events[0]?.timestamp;
      const mins = minutesAgo(lastUpdate);
      return mins === null || mins >= STALLED_MINUTES;
    });

    return {
      stalled,
      healthy: liveMatches.filter((match) => !stalled.some((item) => item.match_id === match.match_id)),
    };
  }, [data, liveMatches]);

  const priorityScore = (pendingApprovals.overdue * 20) + (liveStatus.stalled.length * 25) + (supportQueue.breached.length * 15) + (supportQueue.unresolved.length * 5);
  const severity = getSeverity(priorityScore);

  const pendingItems: PendingActionItem[] = [
    {
      id: 'approvals',
      label: 'Approvals queue',
      description: 'Scorelists and certificates waiting for action.',
      count: pendingApprovals.total,
      to: '/admin/work-queue',
    },
    {
      id: 'live',
      label: 'Live scoring stalled',
      description: `Matches with no timeline update in ${STALLED_MINUTES}+ min.`,
      count: liveStatus.stalled.length,
      to: '/admin/match-center',
    },
    {
      id: 'support',
      label: 'Unresolved support tickets',
      description: 'Open support requests requiring response or closure.',
      count: supportQueue.unresolved.length,
      to: '/admin/work-queue',
    },
  ];

  const recentActivity = (data?.auditEvents || [])
    .filter((event) => ['support_ticket', 'scorelist', 'certificate', 'match'].includes((event.entity_type || '').toLowerCase()))
    .sort((a, b) => (parseTimestamp(b.timestamp)?.getTime() || 0) - (parseTimestamp(a.timestamp)?.getTime() || 0))
    .slice(0, 12);

  if (!isAdmin && !canSeeApprovals && !canSeeSupport && !canSeeLive) {
    return <Navigate to="/management" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto space-y-6 px-4 py-6">
        <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-background to-accent/10">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin Ops</p>
              <h1 className="font-display text-3xl font-bold">Operations Center</h1>
              <p className="text-sm text-muted-foreground">Cross-module command board for approvals, live scoring and support queue health.</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={severity === 'critical' ? 'destructive' : severity === 'attention' ? 'secondary' : 'outline'}>
                Priority Score: {priorityScore}
              </Badge>
              <Button variant="outline" onClick={() => refetch()} loading={isFetching} loadingText="Refreshing...">
                <TimerReset className="mr-1 h-4 w-4" /> Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <PendingActionsPanel title="Priority Widgets" items={pendingItems} />

        <div className="grid gap-4 lg:grid-cols-3">
          {canSeeApprovals && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Pending approvals</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Total pending: <strong>{pendingApprovals.total}</strong></p>
                <p className="text-destructive">Overdue: <strong>{pendingApprovals.overdue}</strong></p>
                <Button asChild size="sm" variant="outline" className="w-full"><Link to="/admin/work-queue">Open approvals queue</Link></Button>
              </CardContent>
            </Card>
          )}

          {canSeeLive && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Live match status</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Live matches: <strong>{liveMatches.length}</strong></p>
                <p className="text-destructive">Stalled scoring: <strong>{liveStatus.stalled.length}</strong></p>
                <Button asChild size="sm" variant="outline" className="w-full"><Link to="/admin/match-center">Open match center</Link></Button>
              </CardContent>
            </Card>
          )}

          {canSeeSupport && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Support queue</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Unresolved: <strong>{supportQueue.unresolved.length}</strong></p>
                <p className="text-destructive">SLA breached: <strong>{supportQueue.breached.length}</strong></p>
                <Button asChild size="sm" variant="outline" className="w-full"><Link to="/admin">Open support desk</Link></Button>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lightweight activity timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && <p className="text-sm text-muted-foreground">Loading activity…</p>}
            {!isLoading && recentActivity.length === 0 && <p className="text-sm text-muted-foreground">No recent ops activity found.</p>}
            {recentActivity.map((event) => (
              <div key={event.event_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2 text-xs">
                <div className="flex items-center gap-2">
                  {event.event_type.includes('escalat') ? <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> : event.entity_type === 'match' ? <Radio className="h-3.5 w-3.5" /> : event.entity_type === 'support_ticket' ? <ShieldAlert className="h-3.5 w-3.5 text-amber-600" /> : <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                  <span className="font-medium">{event.actor_user}</span>
                  <span className="text-muted-foreground">{event.event_type}</span>
                  <Badge variant="outline" className="text-[10px]">{event.entity_type}</Badge>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock3 className="h-3 w-3" />
                  <span>{formatInIST(event.timestamp)} IST</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOpsCenter;

import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Shield, ShieldCheck, Clock, CheckCircle2, ChevronDown, ChevronUp, Send, Loader2, MessageSquare, Crown, FileText, Users, AlertTriangle, BriefcaseBusiness, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { v2api, logAudit, istNow } from '@/lib/v2api';
import { ManagementUser, DigitalScorelist, CertificationApproval, BoardConfiguration } from '@/lib/v2types';
import { getScheduleApprovalRoadmap, getScheduleDetailedStatus, getScorelistDetailedStatus, getScorelistRoadmap, resolveStageFromDesignation, scorelistStageLabels, scorelistStageOrder } from '@/lib/workflowStatus';
import { useToast } from '@/hooks/use-toast';
import { Navigate, Link } from 'react-router-dom';
import { useData } from '@/lib/DataContext';
import { generateId } from '@/lib/utils';
import { getAdminNotificationRecipient, sendScorelistApprovalRequestBulk, sendSystemEmail, sendApprovalThankYouEmail, sendScorelistStatusEmailToAdmin, sendMessageNotificationEmail, sendScorelistReminderEmail } from '@/lib/mailer';
import { DataIntegrityBadge, SecurityShieldBadge, SessionFingerprint } from '@/components/SecurityBadge';
import { PageLoader } from '@/components/LoadingOverlay';
import { scheduleService } from '@/schedules/scheduleService';
import { getActorId, isScheduleApproverRole } from '@/lib/accessControl';
import { ScheduleRecord } from '@/schedules/types';
import { formatInIST } from '@/lib/time';

const stageOrder: readonly (typeof scorelistStageOrder)[number][] = scorelistStageOrder;
const stageLabels: Record<string, string> = scorelistStageLabels;

const ManagementPage = () => {
  const { user, isManagement, isAdmin } = useAuth();
  const { players, messages, addMessage } = useData();
  const { toast } = useToast();
  const [mgmtUsers, setMgmtUsers] = useState<ManagementUser[]>([]);
  const [scorelists, setScorelists] = useState<DigitalScorelist[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedScorelist, setExpandedScorelist] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [msgTo, setMsgTo] = useState('all');
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [sending, setSending] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewingScorelist, setReviewingScorelist] = useState<DigitalScorelist | null>(null);
  const [scorelistActionLoading, setScorelistActionLoading] = useState(false);
  const [scheduleActionLoadingId, setScheduleActionLoadingId] = useState<string | null>(null);
  const [scheduleComments, setScheduleComments] = useState<Record<string, string>>({});
  const [boardConfig, setBoardConfig] = useState<BoardConfiguration | null>(null);

  const refresh = async () => {
    const [users, scorelistData, boardRows] = await Promise.all([v2api.getManagementUsers(), v2api.getScorelists(), v2api.getBoardConfiguration(), scheduleService.syncFromBackend()]);
    setMgmtUsers(users.filter(m => String(m.status || '').trim().toLowerCase() !== 'inactive'));
    setScorelists(scorelistData);
    setBoardConfig(boardRows[0] || null);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);


  const administrationTeam = useMemo(() => {
    const ids = String(boardConfig?.administration_team_ids || '').split(',').map((id) => id.trim()).filter(Boolean);
    return mgmtUsers.filter((member) => ids.includes(member.management_id));
  }, [boardConfig?.administration_team_ids, mgmtUsers]);

  const leadership = mgmtUsers.filter(m => ['President', 'Vice President', 'Secretary', 'Treasurer'].includes(m.designation));
  const administrationTeamIds = useMemo(() => String(boardConfig?.administration_team_ids || '').split(',').map((id) => id.trim()).filter(Boolean), [boardConfig?.administration_team_ids]);
  const boardMembers = useMemo(() => {
    const roleOrder = ['President', 'Vice President', 'Secretary', 'Treasurer'];
    return [...mgmtUsers].sort((a, b) => {
      const roleA = roleOrder.indexOf(a.designation);
      const roleB = roleOrder.indexOf(b.designation);
      const normalizedRoleA = roleA === -1 ? Number.MAX_SAFE_INTEGER : roleA;
      const normalizedRoleB = roleB === -1 ? Number.MAX_SAFE_INTEGER : roleB;
      if (normalizedRoleA !== normalizedRoleB) return normalizedRoleA - normalizedRoleB;
      return a.name.localeCompare(b.name);
    });
  }, [mgmtUsers]);
  const configuredBoardTeam = useMemo(() => boardMembers.filter((member) => administrationTeamIds.includes(member.management_id)), [administrationTeamIds, boardMembers]);
  const otherBoardMembers = useMemo(() => boardMembers.filter((member) => !administrationTeamIds.includes(member.management_id)), [administrationTeamIds, boardMembers]);
  const resolveMessageIdentity = (id: string) => {
    if (id === 'admin') return '🛡️ Admin';
    if (id === 'all') return '📢 All';
    const mgmt = mgmtUsers.find((m) => m.management_id === id || m.username === id);
    if (mgmt) return `${mgmt.name} (${mgmt.designation})`;
    return players.find((p) => p.player_id === id)?.name || id;
  };

  const pendingScorelists = useMemo(() => scorelists.filter(s => {
    if (s.locked) return false;
    if (!isManagement || !user?.management_id) return false;
    const certs: CertificationApproval[] = s.certifications_json ? JSON.parse(s.certifications_json) : [];
    if (certs.some(c => c.approver_id === user.management_id)) return false;
    const userStage = resolveStageFromDesignation(user.designation || '');
    if (!userStage) return false;
    if (userStage === 'official_certified' && certs.some(c => c.stage === 'official_certified')) return false;
    const currentIdx = stageOrder.indexOf((s.certification_status || 'draft') as (typeof scorelistStageOrder)[number]);
    const nextStage = currentIdx < stageOrder.length - 1 ? stageOrder[currentIdx + 1] : null;
    return nextStage === userStage;
  }), [isManagement, scorelists, user?.designation, user?.management_id]);
  const scheduleApprover = isManagement && isScheduleApproverRole(user?.designation);
  const pendingSchedules = useMemo(() => {
    if (!scheduleApprover || !user) return [] as ScheduleRecord[];
    return scheduleService.getSchedules().filter((schedule) => {
      if (schedule.status !== 'pending_approval') return false;
      const approvals = scheduleService.getApprovals().filter((item) => item.schedule_id === schedule.schedule_id);
      return !approvals.some((item) => item.approver_id === getActorId(user));
    });
  }, [scheduleApprover, user, loading, scheduleActionLoadingId]);

  const reviewSchedule = async (scheduleId: string, decision: 'approved' | 'rejected') => {
    if (!user) return;
    setScheduleActionLoadingId(scheduleId);
    try {
      if (decision === 'approved') await scheduleService.approveSchedule(scheduleId, scheduleComments[scheduleId] || '', user);
      else await scheduleService.rejectSchedule(scheduleId, scheduleComments[scheduleId] || '', user);
      toast({ title: decision === 'approved' ? 'Schedule approved' : 'Schedule rejected', description: decision === 'approved' ? 'Your schedule approval has been recorded.' : 'The schedule was returned for revision.' });
      await refresh();
    } catch (error) {
      toast({ title: 'Schedule action failed', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    } finally {
      setScheduleActionLoadingId(null);
    }
  };

  useEffect(() => {
    if (!isManagement || !user?.management_id) return;
    const currentMgmt = mgmtUsers.find((member) => member.management_id === user.management_id);
    if (!currentMgmt?.email || pendingScorelists.length === 0) return;

    const reminderKey = `mgmt-scorelist-reminders:${user.management_id}`;
    const stored = JSON.parse(localStorage.getItem(reminderKey) || '{}') as Record<string, number>;

    pendingScorelists.forEach((scorelist) => {
      const lastSent = stored[scorelist.scorelist_id] || 0;
      if (Date.now() - lastSent < 1000 * 60 * 60 * 6) return;
      sendScorelistReminderEmail({
        to: currentMgmt.email,
        approverName: currentMgmt.name,
        scorelistId: scorelist.scorelist_id,
        stageLabel: stageLabels[resolveStageFromDesignation(user.designation || '') || 'draft'] || 'Pending approval',
        pendingSince: scorelist.generated_at,
      }).catch(console.warn);
      stored[scorelist.scorelist_id] = Date.now();
    });

    localStorage.setItem(reminderKey, JSON.stringify(stored));
  }, [isManagement, mgmtUsers, pendingScorelists, user?.designation, user?.management_id]);

  const signScorelist = async (scorelist: DigitalScorelist, comment?: string) => {
    if (!isManagement || !user?.management_id) return;
    setScorelistActionLoading(true);
    const certs: CertificationApproval[] = scorelist.certifications_json ? JSON.parse(scorelist.certifications_json) : [];
    if (certs.some(c => c.approver_id === user.management_id)) {
      setScorelistActionLoading(false);
      toast({ title: 'Already signed' }); return;
    }
    const stage = resolveStageFromDesignation(user.designation || '') || 'referee_verified';
    certs.push({
      approver_id: user.management_id,
      approver_name: user.name || 'Management User',
      designation: user.designation || 'Management',
      timestamp: new Date().toISOString(),
      token: `MGT_CERT_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      stage,
    });
    const locked = stage === 'official_certified';
    await v2api.updateScorelist({
      ...scorelist,
      certification_status: stage,
      certifications_json: JSON.stringify(certs),
      locked,
    });
    logAudit(user.management_id, 'management_sign_scorelist', 'scorelist', scorelist.scorelist_id,
      JSON.stringify({ stage, locked, certificationCount: certs.length, comment: comment || '', by: user.name || user.username, designation: user.designation || '', scorelistStatusBefore: scorelist.certification_status || 'draft' }));
    if (comment?.trim()) {
      await addMessage({ id: generateId('MSG'), from_id: user.management_id, to_id: 'admin', subject: `Scorelist approved: ${scorelist.scorelist_id}`, body: `[Approval Comment] ${comment.trim()}`, date: new Date().toISOString().split('T')[0], read: false, reply_to: '', timestamp: new Date().toISOString() });
    }

    // Send thank you email to approver
    const currentMgmt = mgmtUsers.find(m => m.management_id === user.management_id);
    if (currentMgmt?.email) {
      const nextStage = locked ? null : stageOrder[stageOrder.indexOf(stage) + 1];
      sendApprovalThankYouEmail({ to: currentMgmt.email, approverName: user.name || user.username, scorelistId: scorelist.scorelist_id, stage: stageLabels[stage], nextStage: nextStage ? stageLabels[nextStage] : undefined }).catch(console.warn);
    }

    // Notify admin
    const adminRecipient = getAdminNotificationRecipient();
    if (adminRecipient) {
      sendScorelistStatusEmailToAdmin({ to: adminRecipient, scorelistId: scorelist.scorelist_id, stage: stageLabels[stage], signedBy: user.name || user.username, designation: user.designation || 'Management', comment: comment || '' }).catch(console.warn);
    }

    // Send approval request to next stage
    const nextStage = locked ? null : stageOrder[stageOrder.indexOf(stage) + 1];
    if (nextStage) {
      const eligibleApprovers = mgmtUsers.filter((m) => resolveStageFromDesignation(m.designation) === nextStage && m.email);
      if (eligibleApprovers.length > 0) {
        await sendScorelistApprovalRequestBulk({ recipients: eligibleApprovers.map((m) => ({ to: m.email, approverName: m.name })), scorelistId: scorelist.scorelist_id, stageLabel: stageLabels[nextStage] || nextStage, actorName: user.name || user.username });
      }
    }

    toast({ title: '✅ Scorelist signed', description: `Signed as ${user.designation}` });
    refresh();
    setScorelistActionLoading(false);
  };

  const rejectScorelist = async (scorelist: DigitalScorelist, comment: string) => {
    if (!user?.management_id) return;
    setScorelistActionLoading(true);
    logAudit(user.management_id, 'management_reject_scorelist', 'scorelist', scorelist.scorelist_id, JSON.stringify({ comment, by: user.name || user.username, designation: user.designation || '' }));
    await addMessage({ id: generateId('MSG'), from_id: user.management_id, to_id: 'admin', subject: `Scorelist rejected: ${scorelist.scorelist_id}`, body: `[Rejection Reason] ${comment}`, date: new Date().toISOString().split('T')[0], read: false, reply_to: '', timestamp: new Date().toISOString() });
    const adminRecipient = getAdminNotificationRecipient();
    if (adminRecipient) {
      await sendSystemEmail({ to: adminRecipient, subject: `Scorelist rejected: ${scorelist.scorelist_id}`, htmlBody: `<p>Scorelist <strong>${scorelist.scorelist_id}</strong> was rejected by <strong>${user.name || user.username}</strong> (${user.designation || 'Management'}).</p><p><strong>Reason:</strong> ${comment}</p>` });
    }
    toast({ title: 'Rejection recorded', description: 'Admin has been notified with your comment.' });
    setScorelistActionLoading(false);
  };

  const openReviewDialog = (scorelist: DigitalScorelist, action: 'approve' | 'reject') => {
    setReviewingScorelist(scorelist);
    setReviewAction(action);
    setReviewComment('');
    setReviewDialogOpen(true);
  };

  const submitReview = async () => {
    if (!reviewingScorelist) return;
    if (reviewAction === 'reject' && !reviewComment.trim()) {
      toast({ title: 'Comment required', description: 'Please add a reason before rejecting.', variant: 'destructive' });
      return;
    }
    if (reviewAction === 'approve') await signScorelist(reviewingScorelist, reviewComment);
    else await rejectScorelist(reviewingScorelist, reviewComment.trim());
    setReviewDialogOpen(false);
    setReviewingScorelist(null);
  };

  const getCerts = (sl: DigitalScorelist): CertificationApproval[] => {
    try { return sl.certifications_json ? JSON.parse(sl.certifications_json) : []; } catch { return []; }
  };

  const handleSendMessage = async () => {
    if (!msgSubject.trim() || !msgBody.trim() || !user) return;
    setSending(true);
    const msg = {
      id: generateId('MSG'), from_id: user.management_id || user.username, to_id: msgTo,
      subject: msgSubject, body: `[${user.designation || 'Management'}] ${msgBody}`,
      date: new Date().toISOString().split('T')[0], read: false, reply_to: '', timestamp: new Date().toISOString(),
    };
    await addMessage(msg);
    logAudit(user.management_id || user.username, 'send_management_notice', 'message', msg.id, JSON.stringify({ to: msgTo, subject: msgSubject, bodyLength: msgBody.length, actorDesignation: user.designation || '' }));

    // Email notification to players
    try {
      const [links, prefs] = await Promise.all([v2api.getEmailLinks(), v2api.getNotificationPrefs()]);
      if (msgTo === 'all') {
        links
          .filter((link) => link.is_verified && link.email)
          .forEach((link) => {
            const pref = prefs.find((entry) => entry.user_id === link.user_id);
            if (pref && !pref.announcements) return;
            const playerName = players.find((player) => player.player_id === link.user_id)?.name || 'Player';
            sendMessageNotificationEmail({
              to: link.email,
              playerName,
              senderName: user.name || user.username,
              senderDesignation: user.designation,
              subject: msgSubject,
              bodyPreview: msgBody,
            }).catch(console.warn);
          });
      } else {
        const link = links.find((entry) => entry.user_id === msgTo && entry.is_verified && entry.email);
        if (link) {
          const pref = prefs.find((entry) => entry.user_id === msgTo);
          if (!pref || pref.announcements) {
            const playerName = players.find((player) => player.player_id === msgTo)?.name || 'Player';
            sendMessageNotificationEmail({ to: link.email, playerName, senderName: user.name || user.username, senderDesignation: user.designation, subject: msgSubject, bodyPreview: msgBody }).catch(console.warn);
          }
        }
      }
    } catch {}

    // Notify admin
    const adminRecipient = getAdminNotificationRecipient();
    if (adminRecipient) {
      sendSystemEmail({ to: adminRecipient, subject: `Management Notice: ${msgSubject}`, htmlBody: `<p><strong>${user.name}</strong> (${user.designation}) sent a notice to <strong>${msgTo === 'all' ? 'All Members' : msgTo}</strong>.</p><p>Subject: ${msgSubject}</p>` }).catch(console.warn);
    }

    toast({ title: '✅ Notice sent', description: `To: ${msgTo === 'all' ? 'All Members' : players.find(p => p.player_id === msgTo)?.name || msgTo}` });
    setShowCompose(false);
    setMsgSubject('');
    setMsgBody('');
    setSending(false);
  };

  const myMessages = messages.filter(m => {
    if (!user) return false;
    const userId = user.management_id || user.username;
    return m.to_id === userId || m.from_id === userId || m.to_id === 'all';
  }).sort((a, b) => new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime());

  if (!user) return <Navigate to="/login" />;
  if (loading) return <div className="min-h-screen bg-background"><Navbar /><PageLoader message="Loading management board..." /></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8">
        {/* Enhanced Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary to-accent mb-2">
            <Crown className="h-8 w-8 md:h-10 md:w-10 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Management Board</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">Club Leadership & Tournament Governance</p>
          <div className="flex items-center justify-center gap-2">
            <SecurityShieldBadge label="Governance Portal" variant="certified" />
            <SessionFingerprint />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Pending approvals</p>
              <p className="mt-1 font-display text-3xl font-bold text-primary">{pendingScorelists.length}</p>
              <p className="text-xs text-muted-foreground">Items currently waiting for your signature or review.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Certified scorelists</p>
              <p className="mt-1 font-display text-3xl font-bold">{scorelists.filter((item) => item.locked).length}</p>
              <p className="text-xs text-muted-foreground">Official documents already locked in the certification chain.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Leadership</p>
              <p className="mt-1 font-display text-3xl font-bold">{leadership.length}</p>
              <p className="text-xs text-muted-foreground">Executive governance members available for escalations.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Governance traffic</p>
              <p className="mt-1 font-display text-3xl font-bold">{myMessages.length}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Integrity hash</span>
                <DataIntegrityBadge data={`${user.management_id}:${pendingScorelists.length}:${myMessages.length}:${scorelists.length}`} label="Governance board hash" />
              </div>
            </CardContent>
          </Card>
        </div>

        {isManagement && (
          <>
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="font-display text-xl flex items-center gap-2"><Crown className="h-5 w-5 text-primary" /> Board Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground">Current Period: {boardConfig?.current_period || 'Not set by admin'}</Badge>
                  <Badge variant="outline">Administration Team: {administrationTeam.length}</Badge>
                </div>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {administrationTeam.map((member) => (
                    <div key={member.management_id} className="rounded-md border bg-background p-3">
                      <p className="font-semibold">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.designation}</p>
                    </div>
                  ))}
                  {administrationTeam.length === 0 && <p className="text-sm text-muted-foreground">Admin has not selected the administration team yet.</p>}
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="pending">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="pending" className="text-xs md:text-sm gap-1">
                <FileText className="h-3 w-3" /> Pending
                {pendingScorelists.length > 0 && <Badge className="bg-destructive text-destructive-foreground text-[10px] h-4 px-1">{pendingScorelists.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs md:text-sm gap-1"><Shield className="h-3 w-3" /> All Scorelists</TabsTrigger>
              {scheduleApprover && <TabsTrigger value="schedule-approvals" className="text-xs md:text-sm gap-1"><Clock className="h-3 w-3" /> Schedule Approvals {pendingSchedules.length > 0 && <Badge className="bg-destructive text-destructive-foreground text-[10px] h-4 px-1">{pendingSchedules.length}</Badge>}</TabsTrigger>}
              <TabsTrigger value="messages" className="text-xs md:text-sm gap-1"><MessageSquare className="h-3 w-3" /> Messages</TabsTrigger>
              <TabsTrigger value="compose" className="text-xs md:text-sm gap-1"><Send className="h-3 w-3" /> Send Notice</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-3 mt-4">
              {pendingScorelists.length === 0 && (
                <Card className="border-2 border-dashed border-primary/20"><CardContent className="p-8 text-center">
                  <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-3" />
                  <p className="font-display text-lg font-bold">All Clear!</p>
                  <p className="text-sm text-muted-foreground">No scorelists pending your signature.</p>
                </CardContent></Card>
              )}
              {pendingScorelists.map(s => {
                const certs = getCerts(s);
                const payload = (() => { try { return JSON.parse(s.payload_json); } catch { return null; } })();
                const match = payload?.match;
                const isExpanded = expandedScorelist === s.scorelist_id;
                return (
                  <Card key={s.scorelist_id} className="border-l-4 border-l-accent hover:shadow-md transition-all">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <p className="font-mono text-xs text-muted-foreground">{s.scorelist_id}</p>
                          {match && <p className="font-display font-bold text-sm">{match.team_a} {match.team_a_score || ''} vs {match.team_b} {match.team_b_score || ''}</p>}
                          <Badge className="bg-accent/20 text-accent-foreground text-xs mt-1">{getScorelistDetailedStatus(s, mgmtUsers)}</Badge>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button size="sm" onClick={() => openReviewDialog(s, 'approve')} className="gap-1 bg-primary hover:bg-primary/90">
                            <ShieldCheck className="h-4 w-4" /> Sign & Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => openReviewDialog(s, 'reject')} className="gap-1">
                            <AlertTriangle className="h-3 w-3" /> Reject
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <Link to="/admin/scorelists">View Details</Link>
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setExpandedScorelist(isExpanded ? null : s.scorelist_id)}>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-t pt-3 space-y-3">
                          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                            {getScorelistRoadmap(s, mgmtUsers).map((step) => (
                              <div key={step.stage} className={`rounded-lg border p-3 text-xs ${step.completed ? 'border-primary/20 bg-primary/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                                <p className="font-semibold">{step.label}</p>
                                <p className="mt-1 text-muted-foreground">{step.completed ? (step.approvals[0] ? `Completed by ${step.approvals[0].designation}` : 'Completed') : (step.pendingApprovers.length > 0 ? `Pending with ${step.pendingApprovers.map((member) => member.designation || member.name).join(', ')}` : `Pending at ${step.label}`)}</p>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Certification Timeline</p>
                          {stageOrder.map(stage => {
                            const cert = stage === 'draft'
                              ? { approver_name: s.generated_by || 'System', designation: 'Scorelist Engine', timestamp: s.generated_at || '', token: 'DRAFT', stage: 'draft' }
                              : certs.find(c => c.stage === stage);
                            return (
                              <div key={stage} className={`flex items-center gap-3 p-2 rounded-lg text-sm ${cert ? 'bg-primary/5 border border-primary/10' : 'opacity-40'}`}>
                                {cert ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-xs">{stageLabels[stage]}</p>
                                  {cert && <p className="text-xs text-muted-foreground truncate">{cert.approver_name} ({cert.designation}) • {formatInIST(cert.timestamp)}</p>}
                                </div>
                                {cert && <Badge variant="outline" className="text-[10px] font-mono shrink-0">{cert.token.substring(0, 10)}</Badge>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="all" className="mt-4">
              <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin">
                {scorelists.length === 0 && <Card><CardContent className="p-6 text-center text-muted-foreground">No scorelists available.</CardContent></Card>}
                {scorelists.map(s => {
                  const certs = getCerts(s);
                  return (
                    <Card key={s.scorelist_id} className="hover:bg-muted/30 transition-colors">
                      <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-mono text-xs">{s.scorelist_id}</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {certs.map((c, i) => <Badge key={i} variant="outline" className="text-[10px]">{c.approver_name}</Badge>)}
                          </div>
                        </div>
                        <Badge className={s.locked ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}>
                          {s.locked ? `🔒 ${getScorelistDetailedStatus(s, mgmtUsers)}` : getScorelistDetailedStatus(s, mgmtUsers)}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {scheduleApprover && (
              <TabsContent value="schedule-approvals" className="mt-4 space-y-3">
                {pendingSchedules.length === 0 && (
                  <Card><CardContent className="p-6 text-center text-muted-foreground">No schedules are waiting for your approval right now.</CardContent></Card>
                )}
                {pendingSchedules.map((schedule) => {
                  const approvals = scheduleService.getApprovals().filter((item) => item.schedule_id === schedule.schedule_id);
                  const roadmap = getScheduleApprovalRoadmap(schedule, approvals);
                  const previous = scheduleService.getSchedules().find((item) => item.schedule_id === schedule.parent_schedule_id);
                  const diff = scheduleService.diffVersions(previous, schedule);
                  return (
                    <Card key={schedule.schedule_id} className="border-l-4 border-l-primary/50">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <p className="font-display font-bold">{schedule.tournament_name} · Version {schedule.version_number}</p>
                            <p className="text-sm text-muted-foreground">{getScheduleDetailedStatus(schedule, approvals)}</p>
                            <p className="text-xs text-muted-foreground mt-1">Submitted on {formatInIST(schedule.timestamp)}</p>
                          </div>
                          <Badge variant="outline">Hash {schedule.hash.slice(0, 12)}…</Badge>
                        </div>

                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                          {roadmap.map((step) => (
                            <div key={step.role} className={`rounded-lg border p-3 text-sm ${step.approval?.decision === 'rejected' ? 'border-destructive/30 bg-destructive/5' : step.completed ? 'border-primary/20 bg-primary/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium">{step.role}</p>
                                <Badge variant={step.approval?.decision === 'rejected' ? 'destructive' : step.completed ? 'default' : 'secondary'}>
                                  {step.approval?.decision === 'rejected' ? 'Rejected' : step.completed ? 'Approved' : 'Pending'}
                                </Badge>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {step.approval ? `${step.approval.approver_name} • ${formatInIST(step.approval.timestamp)}` : 'Awaiting action from this approver.'}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="rounded-lg border bg-muted/20 p-3 text-sm space-y-1">
                          <p><strong>Change log:</strong> {schedule.change_log || '—'}</p>
                          {schedule.rejection_reason && <p><strong>Revision note:</strong> {schedule.rejection_reason}</p>}
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium">Diff against previous version</p>
                          {diff.length === 0 && <p className="text-sm text-muted-foreground">Baseline version.</p>}
                          {diff.map((entry) => (
                            <div key={entry.match_id} className={`rounded border p-2 text-sm ${entry.kind === 'added' ? 'bg-green-500/10 border-green-500/30' : entry.kind === 'updated' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                              {entry.kind.toUpperCase()} · {entry.current?.team_a || entry.previous?.team_a} vs {entry.current?.team_b || entry.previous?.team_b}
                            </div>
                          ))}
                        </div>

                        <Textarea
                          placeholder="Approval or rejection note"
                          value={scheduleComments[schedule.schedule_id] || ''}
                          onChange={(e) => setScheduleComments((prev) => ({ ...prev, [schedule.schedule_id]: e.target.value }))}
                        />
                        <div className="flex gap-2 flex-wrap">
                          <Button loading={scheduleActionLoadingId === schedule.schedule_id} loadingText="Approving..." onClick={() => reviewSchedule(schedule.schedule_id, 'approved')}>
                            Approve
                          </Button>
                          <Button variant="destructive" loading={scheduleActionLoadingId === schedule.schedule_id} loadingText="Rejecting..." onClick={() => reviewSchedule(schedule.schedule_id, 'rejected')}>
                            Reject
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>
            )}

            <TabsContent value="messages" className="mt-4 space-y-3">
              <h3 className="font-display text-lg font-bold flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary" /> Messages</h3>
              {myMessages.length === 0 && <Card><CardContent className="p-6 text-center text-muted-foreground">No messages yet.</CardContent></Card>}
              <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin">
                {myMessages.slice(0, 20).map(msg => {
                  const isFromMe = msg.from_id === (user.management_id || user.username);
                  const senderName = isFromMe ? `You (${user.designation || 'Management'})` : resolveMessageIdentity(msg.from_id);
                  return (
                    <Card
                      key={msg.id}
                      className={`relative overflow-hidden transition-all duration-300 hover:shadow-md ${
                        isFromMe
                          ? 'border border-primary/35 bg-gradient-to-r from-primary/10 via-background to-accent/10'
                          : 'border border-slate-200/70 bg-gradient-to-r from-slate-100/75 via-background to-primary/5'
                      }`}
                    >
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35)_0%,transparent_40%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.25)_0%,transparent_45%)]" />
                      <CardContent className="p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-foreground">{msg.subject}</span>
                          <span className="text-xs text-muted-foreground">{formatInIST(msg.timestamp || msg.date)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{senderName} → {resolveMessageIdentity(msg.to_id)}</p>
                        <p className="text-sm leading-relaxed text-foreground/90">{msg.body}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="compose" className="mt-4">
              <Card className="relative overflow-hidden border border-amber-300/45 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.95)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_15%,rgba(251,191,36,0.2)_0%,transparent_35%),radial-gradient(circle_at_90%_85%,rgba(168,85,247,0.16)_0%,transparent_35%)]" />
                <CardHeader className="relative z-10">
                  <CardTitle className="font-display text-sm flex items-center gap-2 text-amber-100">
                    <Send className="h-4 w-4 text-amber-300" /> Send Official Notice
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10 space-y-3">
                  <p className="text-xs text-slate-200/85">
                    Sent as: <strong className="text-slate-50">{user.name}</strong> – <Badge variant="outline" className="text-xs border-amber-300/50 bg-amber-400/10 text-amber-100">{user.designation}</Badge>
                  </p>
                  <div>
                    <Label className="text-slate-100">To</Label>
                    <Select value={msgTo} onValueChange={setMsgTo}>
                      <SelectTrigger className="border-slate-400/35 bg-white/10 text-slate-50 placeholder:text-slate-300/70"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all"><span className="flex items-center gap-1"><Users className="h-3 w-3" /> All Members</span></SelectItem>
                        {players.map(p => <SelectItem key={p.player_id} value={p.player_id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-100">Subject</Label>
                    <Input value={msgSubject} onChange={e => setMsgSubject(e.target.value)} placeholder="Notice subject..." className="border-slate-400/35 bg-white/10 text-slate-50 placeholder:text-slate-300/70" />
                  </div>
                  <div>
                    <Label className="text-slate-100">Message</Label>
                    <Textarea value={msgBody} onChange={e => setMsgBody(e.target.value)} placeholder="Write your message..." className="min-h-[100px] border-slate-400/35 bg-white/10 text-slate-50 placeholder:text-slate-300/70" />
                  </div>
                  <Button onClick={handleSendMessage} loading={sending} loadingText="Sending notice..." disabled={!msgSubject.trim() || !msgBody.trim()} className="gap-1 bg-amber-500 text-amber-950 hover:bg-amber-400">
                    <Send className="h-3 w-3" /> Send Notice
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            </Tabs>
          </>
        )}

        <section className="space-y-4">
          <div className="rounded-2xl border bg-gradient-to-r from-primary/10 via-accent/5 to-background p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Board Directory</p>
                <h2 className="font-display text-2xl md:text-3xl font-bold mt-1 flex items-center gap-2">
                  <Crown className="h-6 w-6 text-primary" /> Management Board Members
                </h2>
                <p className="text-sm text-muted-foreground mt-2">Complete governance roster, including the admin-selected Management Board Configuration team.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-primary text-primary-foreground">Total Board Members: {boardMembers.length}</Badge>
                <Badge variant="outline">Configured Team: {configuredBoardTeam.length}</Badge>
                <Badge variant="outline">Period: {boardConfig?.current_period || 'Not set'}</Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card className="border-primary/30 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> Management Board Configuration Team
                </CardTitle>
                <p className="text-xs text-muted-foreground">This list is loaded from admin board settings.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {configuredBoardTeam.length === 0 && (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Admin has not selected and saved the management board configuration team yet.
                  </div>
                )}
                {configuredBoardTeam.map((member) => (
                  <div key={member.management_id} className="rounded-xl border bg-primary/5 p-3 flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                      {member.signature_image ? (
                        <img src={member.signature_image} alt={member.name} className="h-12 w-12 rounded-xl object-cover" />
                      ) : (
                        <Crown className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-bold truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email || 'No email configured'}</p>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <Badge className="bg-primary text-primary-foreground text-[10px]">{member.designation}</Badge>
                        {member.role && <Badge variant="outline" className="text-[10px]">{member.role}</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <BriefcaseBusiness className="h-5 w-5 text-accent" /> Full Board Roster
                </CardTitle>
                <p className="text-xs text-muted-foreground">All active management members are shown below.</p>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {boardMembers.map((member) => {
                  const highlighted = administrationTeamIds.includes(member.management_id);
                  return (
                    <div key={member.management_id} className={`rounded-xl border p-3 flex items-center gap-3 ${highlighted ? 'border-primary/40 bg-primary/5' : 'bg-background'}`}>
                      <div className="h-11 w-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        {member.signature_image ? (
                          <img src={member.signature_image} alt={member.name} className="h-11 w-11 rounded-lg object-cover" />
                        ) : (
                          <User className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email || 'No email configured'}</p>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <Badge variant={highlighted ? 'default' : 'outline'} className="text-[10px]">{member.designation}</Badge>
                          {member.role && <Badge variant="outline" className="text-[10px]">{member.role}</Badge>}
                          {highlighted && <Badge className="bg-accent/20 text-accent-foreground text-[10px]">Configured Team</Badge>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {otherBoardMembers.length === 0 && boardMembers.length > 0 && (
                  <p className="text-xs text-muted-foreground">All board members are currently part of the configured team.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {mgmtUsers.length === 0 && <p className="text-center text-muted-foreground py-8">No management users configured yet.</p>}
      </div>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewAction === 'approve' ? <ShieldCheck className="h-5 w-5 text-primary" /> : <AlertTriangle className="h-5 w-5 text-destructive" />}
              {reviewAction === 'approve' ? 'Approve Scorelist' : 'Reject Scorelist'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-mono">{reviewingScorelist?.scorelist_id}</p>
            <div>
              <Label>{reviewAction === 'approve' ? 'Approval comment (optional)' : 'Rejection reason (required)'}</Label>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder={reviewAction === 'approve' ? 'Add any note for audit trail...' : 'Explain why this scorelist is rejected...'}
                className="min-h-[110px]"
              />
            </div>
            <Button
              onClick={submitReview}
              loading={scorelistActionLoading}
              loadingText={reviewAction === 'approve' ? 'Approving...' : 'Rejecting...'}
              variant={reviewAction === 'approve' ? 'default' : 'destructive'}
              className="w-full"
            >
              {reviewAction === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagementPage;

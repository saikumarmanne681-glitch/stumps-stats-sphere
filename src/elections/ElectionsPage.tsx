import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BarChart3, CheckCircle2, Crown, Lock, ShieldCheck, Sparkles, Users, Vote } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/lib/auth';
import { canContestElection, canManageElections, canVoteInElection, getActorId, getActorName } from '@/lib/accessControl';
import { useToast } from '@/hooks/use-toast';
import { electionService } from './electionService';
import { ElectionRecord, NominationRecord, NominationStatus } from './types';
import { v2api } from '@/lib/v2api';
import { ClosedAccessScreen } from '@/components/ClosedAccessScreen';
import { parseSheetBoolean } from '@/lib/sheetValueParsers';

const DEFAULT_ROLES = ['President', 'Secretary', 'Treasurer', 'Captain'];

const nominationStatusLabels: Record<NominationStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

const nominationKey = (item: NominationRecord) => item.nomination_id?.trim() || `${item.election_id}:${item.nominee_user_id}:${item.role_name}`;

const ElectionsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [accessLoading, setAccessLoading] = useState(true);
  const [electionsClosed, setElectionsClosed] = useState(false);
  const [electionsClosedReason, setElectionsClosedReason] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [roles, setRoles] = useState(DEFAULT_ROLES.join(', '));
  const [notificationDate, setNotificationDate] = useState('');
  const [nominationStart, setNominationStart] = useState('');
  const [nominationEnd, setNominationEnd] = useState('');
  const [scrutinyDate, setScrutinyDate] = useState('');
  const [pollingDay, setPollingDay] = useState('');
  const [resultsDay, setResultsDay] = useState('');
  const [withdrawalDeadline, setWithdrawalDeadline] = useState('');

  const [selectedElectionId, setSelectedElectionId] = useState('');

  const [nominationRole, setNominationRole] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [proposer, setProposer] = useState('');
  const [seconder, setSeconder] = useState('');
  const [manifesto, setManifesto] = useState('');
  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  const [reviewRemarks, setReviewRemarks] = useState<Record<string, string>>({});
  const [termStart, setTermStart] = useState('');
  const [termEnd, setTermEnd] = useState('');
  const [voteSelections, setVoteSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([electionService.syncFromBackend(), v2api.getBoardConfiguration()])
      .then(([, boardRows]) => {
        const config = boardRows[0];
        setElectionsClosed(parseSheetBoolean(config?.elections_closed));
        setElectionsClosedReason(config?.elections_closed_reason || '');
      })
      .finally(() => {
        setRefreshKey((v) => v + 1);
        setAccessLoading(false);
      });
  }, []);

  const elections = useMemo(() => electionService.getElections(), [refreshKey]);
  const nominations = useMemo(() => electionService.getNominations(), [refreshKey]);
  const votes = useMemo(() => electionService.getVotes(), [refreshKey]);
  const terms = useMemo(() => electionService.getTerms(), [refreshKey]);

  const activeElection = elections.find((item) => item.election_id === selectedElectionId) || elections[0];
  const electionRoles = activeElection?.roles_json.split('|').filter(Boolean) || [];
  const approvedNominations = nominations.filter((item) => item.election_id === activeElection?.election_id && item.status === 'approved');
  const myNominations = nominations.filter((item) => item.election_id === activeElection?.election_id && item.nominee_user_id === getActorId(user));
  const nominationsByRole = electionRoles.reduce<Record<string, NominationRecord[]>>((acc, role) => {
    acc[role] = approvedNominations.filter((item) => item.role_name === role);
    return acc;
  }, {});

  const activeVotes = votes.filter((vote) => vote.election_id === activeElection?.election_id);
  const uniqueVoters = new Set(activeVotes.map((vote) => vote.voter_user_id));
  const eligibleVoters = new Set([
    ...approvedNominations.map((item) => item.nominee_user_id),
    ...nominations.filter((item) => item.election_id === activeElection?.election_id).map((item) => item.nominee_user_id),
  ]);
  const turnoutPercent = eligibleVoters.size > 0 ? Math.round((uniqueVoters.size / eligibleVoters.size) * 100) : 0;

  const canShowNotice = Boolean(activeElection?.show_notice);
  const nominationOpenByDate = !!activeElection && (!activeElection.nomination_start || new Date(activeElection.nomination_start) <= new Date()) && (!activeElection.nomination_end || new Date(activeElection.nomination_end) >= new Date());
  const nominationModuleActive = Boolean(activeElection?.enable_nominations) && nominationOpenByDate;
  const statusModuleActive = Boolean(activeElection?.enable_status_tracking);
  const candidateListVisible = Boolean(activeElection?.publish_candidate_list);
  const pollDateReached = !!activeElection?.voting_start && new Date(activeElection.voting_start) <= new Date();
  const pollingActive = Boolean(activeElection?.enable_voting) && pollDateReached && !activeElection?.close_polling;
  const resultsVisible = Boolean(activeElection?.publish_results);

  const refresh = () => setRefreshKey((v) => v + 1);

  const handleCreateElection = async () => {
    if (!user || !canManageElections(user)) return;
    try {
      await electionService.createElection({
        title,
        description,
        roles_json: roles.split(',').map((item) => item.trim()).filter(Boolean).join('|'),
        eligible_roles_json: 'player',
        status: 'open',
        notification_date: notificationDate,
        nomination_start: nominationStart,
        nomination_end: nominationEnd,
        withdrawal_deadline: withdrawalDeadline,
        scrutiny_date: scrutinyDate,
        voting_start: pollingDay,
        voting_end: pollingDay,
        results_day: resultsDay,
        created_by: getActorId(user),
        show_notice: false,
        enable_nominations: false,
        enable_status_tracking: true,
        publish_candidate_list: false,
        enable_voting: false,
        close_polling: false,
        publish_results: false,
        archive_election: false,
      }, user);
      toast({ title: 'Election created', description: 'Use the master control panel to release each phase.' });
      setTitle('');
      setDescription('');
      setRoles(DEFAULT_ROLES.join(', '));
      refresh();
    } catch (error) {
      toast({ title: 'Unable to create election', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    }
  };

  const updatePhase = async (patch: Partial<ElectionRecord>) => {
    if (!activeElection || !user || !canManageElections(user)) return;
    try {
      await electionService.updateElection(activeElection.election_id, patch, user);
      refresh();
    } catch (error) {
      toast({ title: 'Unable to update phase', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    }
  };

  const handleNominate = async () => {
    if (!activeElection || !user || !canContestElection(user)) return;
    try {
      await electionService.submitNomination({
        election_id: activeElection.election_id,
        role_name: nominationRole,
        nominee_user_id: getActorId(user),
        nominee_name: getActorName(user),
        player_id: playerId || getActorId(user),
        proposer_user_id: getActorId(user),
        proposer_name: proposer,
        seconder_name: seconder,
        manifesto,
        declaration_accepted: declarationAccepted,
      }, user);
      toast({ title: 'Nomination submitted', description: 'Your nomination is now in Submitted status.' });
      setNominationRole('');
      setPlayerId('');
      setProposer('');
      setSeconder('');
      setManifesto('');
      setDeclarationAccepted(false);
      refresh();
    } catch (error) {
      toast({ title: 'Nomination failed', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    }
  };

  const handleReview = async (nominationId: string, status: 'under_review' | 'approved' | 'rejected') => {
    if (!user) return;
    try {
      await electionService.reviewNomination(nominationId, status, reviewRemarks[nominationId] || '', user);
      refresh();
    } catch (error) {
      toast({ title: 'Status update failed', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    }
  };

  const handleWithdraw = async (nominationId: string) => {
    if (!user) return;
    try {
      await electionService.withdrawNomination(nominationId, user);
      refresh();
    } catch (error) {
      toast({ title: 'Withdraw failed', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    }
  };

  const handleVote = async () => {
    if (!activeElection || !user) return;
    try {
      const selections = Object.fromEntries(Object.entries(voteSelections).filter(([, value]) => !!value).map(([role, nominee]) => {
        const nomination = approvedNominations.find((item) => item.nominee_user_id === nominee && item.role_name === role);
        return [role, { nominee_user_id: nominee, nominee_name: nomination?.nominee_name || nominee }];
      }));
      await electionService.castVotes({ electionId: activeElection.election_id, selections }, user);
      toast({ title: 'Vote Submitted Successfully', description: 'Your ballot is locked. One player = one vote.' });
      refresh();
    } catch (error) {
      toast({ title: 'Voting failed', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    }
  };

  const handlePublishResults = async () => {
    if (!activeElection || !user || !canManageElections(user) || !termStart || !termEnd) return;
    try {
      await electionService.publishResults(activeElection.election_id, termStart, termEnd, user);
      refresh();
    } catch (error) {
      toast({ title: 'Result publish failed', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    }
  };

  if (!user) return <Navigate to="/login" replace />;
  if (!accessLoading && electionsClosed) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <ClosedAccessScreen title="Elections are currently closed" reason={electionsClosedReason} backHref="/" homeHref="/" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/30 via-fuchsia-600/20 to-cyan-500/20 p-8 shadow-2xl backdrop-blur-xl">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-fuchsia-500/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />
          <p className="text-sm uppercase tracking-[0.3em] text-slate-300">Private Club Election Portal</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Executive Elections Command Center</h1>
          <p className="mt-2 max-w-2xl text-slate-200/90">Luxury-grade election workflow with strict phase controls, audited voting, and transparent publication of candidates and results.</p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs">
            <Badge className="bg-white/10 text-slate-100 hover:bg-white/20"><Sparkles className="mr-1 h-3.5 w-3.5" /> Premium Governance UX</Badge>
            <Badge className="bg-white/10 text-slate-100 hover:bg-white/20"><ShieldCheck className="mr-1 h-3.5 w-3.5" /> Controlled by Admin Phases</Badge>
            <Badge className="bg-white/10 text-slate-100 hover:bg-white/20"><BarChart3 className="mr-1 h-3.5 w-3.5" /> Live Turnout Analytics</Badge>
          </div>
        </div>

        {canManageElections(user) && (
          <Card className="border-white/10 bg-white/[0.03] shadow-xl">
            <CardHeader><CardTitle>Create Election</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2"><Label>Election Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div className="space-y-1 md:col-span-2"><Label>Positions Open</Label><Input value={roles} onChange={(e) => setRoles(e.target.value)} /></div>
              <div className="space-y-1 md:col-span-2"><Label>Rules & Eligibility</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
              <div className="space-y-1"><Label>Notice Date</Label><Input type="date" value={notificationDate} onChange={(e) => setNotificationDate(e.target.value)} /></div>
              <div className="space-y-1"><Label>Nomination Start</Label><Input type="date" value={nominationStart} onChange={(e) => setNominationStart(e.target.value)} /></div>
              <div className="space-y-1"><Label>Nomination End</Label><Input type="date" value={nominationEnd} onChange={(e) => setNominationEnd(e.target.value)} /></div>
              <div className="space-y-1"><Label>Scrutiny Date</Label><Input type="date" value={scrutinyDate} onChange={(e) => setScrutinyDate(e.target.value)} /></div>
              <div className="space-y-1"><Label>Polling Date</Label><Input type="date" value={pollingDay} onChange={(e) => setPollingDay(e.target.value)} /></div>
              <div className="space-y-1"><Label>Result Date</Label><Input type="date" value={resultsDay} onChange={(e) => setResultsDay(e.target.value)} /></div>
              <div className="space-y-1"><Label>Withdrawal Deadline</Label><Input type="date" value={withdrawalDeadline} onChange={(e) => setWithdrawalDeadline(e.target.value)} /></div>
              <Button className="md:col-span-2" onClick={handleCreateElection} disabled={!title.trim()}>Create Election</Button>
            </CardContent>
          </Card>
        )}

        <Card className="border-white/10 bg-white/[0.03] shadow-xl">
          <CardHeader><CardTitle>Select Election</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {elections.length === 0 && <p className="text-sm text-muted-foreground">No election created yet.</p>}
            {elections.map((item) => (
              <button key={item.election_id} onClick={() => setSelectedElectionId(item.election_id)} className={`w-full rounded-xl border p-3 text-left transition ${activeElection?.election_id === item.election_id ? 'border-cyan-400/80 bg-cyan-500/10 shadow-lg shadow-cyan-500/20' : 'border-white/15 bg-white/[0.02] hover:bg-white/[0.05]'}`}>
                <p className="font-semibold">{item.title}</p>
                <p className="text-xs text-slate-300">{item.description}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        {activeElection && canManageElections(user) && (
          <Card className="border-white/10 bg-white/[0.03] shadow-xl">
            <CardHeader><CardTitle>Master Election Control Panel</CardTitle></CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-2">
              {[
                ['Show Election Notice', 'show_notice'],
                ['Enable Nominations', 'enable_nominations'],
                ['Enable Status Tracking', 'enable_status_tracking'],
                ['Publish Candidate List', 'publish_candidate_list'],
                ['Enable Voting', 'enable_voting'],
                ['Close Polling', 'close_polling'],
                ['Publish Results', 'publish_results'],
                ['Archive Election', 'archive_election'],
              ].map(([label, key]) => (
                <label key={key} className="flex items-center justify-between border rounded p-3 text-sm">
                  <span>{label}</span>
                  <Checkbox checked={Boolean(activeElection[key as keyof ElectionRecord])} onCheckedChange={(checked) => updatePhase({ [key]: Boolean(checked) } as Partial<ElectionRecord>)} />
                </label>
              ))}
            </CardContent>
          </Card>
        )}

        {activeElection && canShowNotice && (
          <Card className="border-white/10 bg-white/[0.03] shadow-xl">
            <CardHeader><CardTitle>Election Notice</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="font-semibold">{activeElection.title}</p>
              <p className="text-sm text-muted-foreground">{activeElection.description}</p>
              <p className="text-sm">Nomination Start: {activeElection.nomination_start || 'TBD'}</p>
              <p className="text-sm">Nomination End: {activeElection.nomination_end || 'TBD'}</p>
              <p className="text-sm">Scrutiny: {activeElection.scrutiny_date || 'TBD'}</p>
              <p className="text-sm">Polling: {activeElection.voting_start || 'TBD'}</p>
              <p className="text-sm">Results: {activeElection.results_day || 'TBD'}</p>
            </CardContent>
          </Card>
        )}

        {activeElection && canContestElection(user) && (
          <Card className="border-white/10 bg-white/[0.03] shadow-xl">
            <CardHeader><CardTitle>Nomination Submission</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {!nominationModuleActive && <p className="text-sm text-muted-foreground md:col-span-2">Nomination phase closed.</p>}
              {nominationModuleActive && (
                <>
                  <div className="space-y-1"><Label>Player Name</Label><Input value={getActorName(user)} disabled /></div>
                  <div className="space-y-1"><Label>Player ID</Label><Input value={playerId} onChange={(e) => setPlayerId(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Position Applied</Label>
                    <select className="h-10 rounded-md border bg-background px-3 text-sm w-full" value={nominationRole} onChange={(e) => setNominationRole(e.target.value)}>
                      <option value="">Select Position</option>
                      {electionRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1"><Label>Proposer</Label><Input value={proposer} onChange={(e) => setProposer(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Seconder</Label><Input value={seconder} onChange={(e) => setSeconder(e.target.value)} /></div>
                  <div className="space-y-1 md:col-span-2"><Label>Manifesto</Label><Textarea value={manifesto} onChange={(e) => setManifesto(e.target.value)} /></div>
                  <div className="md:col-span-2 flex items-center gap-2"><Checkbox checked={declarationAccepted} onCheckedChange={(checked) => setDeclarationAccepted(Boolean(checked))} /><Label>I declare all details are correct.</Label></div>
                  <Button className="md:col-span-2" onClick={handleNominate} disabled={!nominationRole || !proposer || !seconder || !manifesto.trim() || !declarationAccepted}>Submit Nomination</Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {activeElection && statusModuleActive && (
          <Card className="border-white/10 bg-white/[0.03] shadow-xl">
            <CardHeader><CardTitle>My Nomination Status</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {myNominations.length === 0 && <p className="text-sm text-muted-foreground">No nominations yet.</p>}
              {myNominations.map((item) => (
                <div key={nominationKey(item)} className="rounded-xl border border-white/15 bg-white/[0.02] p-3">
                  <p className="font-medium">Position: {item.role_name}</p>
                  <p className="text-sm">Status: {nominationStatusLabels[item.status]}</p>
                  <p className="text-xs text-muted-foreground">Remarks: {item.remarks || '-'}</p>
                  {canContestElection(user) && activeElection.withdrawal_deadline && new Date(activeElection.withdrawal_deadline) >= new Date() && item.status !== 'withdrawn' && (
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => handleWithdraw(nominationKey(item))}>Withdraw Nomination</Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {activeElection && canManageElections(user) && (
          <Card className="border-white/10 bg-white/[0.03] shadow-xl">
            <CardHeader><CardTitle>Admin Nomination Review</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {nominations.filter((item) => item.election_id === activeElection.election_id).map((item) => (
                <div key={nominationKey(item)} className="rounded-xl border border-white/15 bg-white/[0.02] p-3 space-y-2">
                  <p className="font-medium">{item.nominee_name} — {item.role_name}</p>
                  <p className="text-xs text-muted-foreground">Current: {nominationStatusLabels[item.status]}</p>
                  <Input placeholder="Remarks / reason" value={reviewRemarks[nominationKey(item)] || ''} onChange={(e) => setReviewRemarks((prev) => ({ ...prev, [nominationKey(item)]: e.target.value }))} />
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => handleReview(nominationKey(item), 'under_review')}>Set Under Review</Button>
                    <Button size="sm" onClick={() => handleReview(nominationKey(item), 'approved')}>Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleReview(nominationKey(item), 'rejected')}>Reject</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {activeElection && candidateListVisible && (
          <Card className="border-white/10 bg-white/[0.03] shadow-xl">
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-cyan-300" />Final Candidate List</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {electionRoles.map((role) => (
                <div key={role} className="rounded-xl border border-white/15 bg-white/[0.02] p-3">
                  <p className="font-semibold flex items-center gap-2"><Crown className="h-4 w-4 text-amber-300" />{role}</p>
                  {(nominationsByRole[role] || []).map((nomination) => <p key={nominationKey(nomination)} className="text-sm">• {nomination.nominee_name}</p>)}
                  {(nominationsByRole[role] || []).length === 0 && <p className="text-sm text-muted-foreground">No approved candidates.</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {activeElection && canVoteInElection(user) && (
          <Card className="border-white/10 bg-white/[0.03] shadow-xl">
            <CardHeader><CardTitle>Polling / Voting</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Badge variant={pollDateReached ? 'secondary' : 'outline'}>{pollDateReached ? 'Polling date reached' : 'Waiting for polling date'}</Badge>
                <Badge variant={activeElection.enable_voting ? 'default' : 'secondary'}>{activeElection.enable_voting ? 'Admin enabled' : 'Awaiting admin enable'}</Badge>
                <Badge variant={pollingActive ? 'default' : 'secondary'}>{pollingActive ? 'Voting active' : 'Voting disabled'}</Badge>
              </div>
              {!pollingActive && <p className="text-sm text-muted-foreground">Voting remains disabled until polling date is reached and admin enables voting.</p>}
              {pollingActive && (
                <>
                  {electionRoles.map((role) => (
                    <div key={role} className="space-y-1">
                      <Label>{role}</Label>
                      <select className="h-10 rounded-md border bg-background px-3 text-sm w-full" value={voteSelections[role] || ''} onChange={(e) => setVoteSelections((prev) => ({ ...prev, [role]: e.target.value }))}>
                        <option value="">Select candidate</option>
                        {(nominationsByRole[role] || []).map((candidate) => <option key={candidate.nomination_id} value={candidate.nominee_user_id}>{candidate.nominee_name}</option>)}
                      </select>
                    </div>
                  ))}
                  <Button onClick={handleVote}><Vote className="h-4 w-4 mr-1" />Cast Vote</Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {activeElection && canManageElections(user) && (
          <Card className="border-white/10 bg-white/[0.03] shadow-xl">
            <CardHeader><CardTitle>Admin Polling Dashboard</CardTitle></CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-2">
              <div className="rounded-xl border border-white/15 bg-white/[0.02] p-3">Eligible Players: {eligibleVoters.size}</div>
              <div className="rounded-xl border border-white/15 bg-white/[0.02] p-3">Votes Cast: {uniqueVoters.size}</div>
              <div className="rounded-xl border border-white/15 bg-white/[0.02] p-3">Pending Voters: {Math.max(eligibleVoters.size - uniqueVoters.size, 0)}</div>
              <div className="rounded-xl border border-white/15 bg-white/[0.02] p-3">Turnout: {turnoutPercent}%</div>
              <div className="rounded-xl border border-white/15 bg-white/[0.02] p-3 md:col-span-2">Live vote submission count: {activeVotes.length}</div>
              <div className="md:col-span-2 flex gap-2">
                <Button variant="outline" onClick={() => updatePhase({ enable_voting: true, close_polling: false })}><ShieldCheck className="h-4 w-4 mr-1" />Open Poll</Button>
                <Button variant="destructive" onClick={() => updatePhase({ close_polling: true, enable_voting: false })}><Lock className="h-4 w-4 mr-1" />Close Election Poll</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeElection && resultsVisible && (
          <Card className="border-white/10 bg-white/[0.03] shadow-xl">
            <CardHeader><CardTitle>Results</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {electionService.calculateResults(activeElection.election_id).map((entry) => (
                <p key={entry.role_name}><span className="font-semibold">{entry.role_name} Winner:</span> {entry.winner_name}</p>
              ))}
            </CardContent>
          </Card>
        )}

        {activeElection && canManageElections(user) && (
          <Card className="border-white/10 bg-white/[0.03] shadow-xl">
            <CardHeader><CardTitle>Result Publication (Admin)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="grid gap-2 md:grid-cols-2">
                <div className="space-y-1"><Label>Term Start</Label><Input type="date" value={termStart} onChange={(e) => setTermStart(e.target.value)} /></div>
                <div className="space-y-1"><Label>Term End</Label><Input type="date" value={termEnd} onChange={(e) => setTermEnd(e.target.value)} /></div>
              </div>
              <Button onClick={handlePublishResults} disabled={!termStart || !termEnd}><CheckCircle2 className="h-4 w-4 mr-1" />Finalize & Publish Results</Button>
            </CardContent>
          </Card>
        )}

        <Card className="border-white/10 bg-white/[0.03] shadow-xl">
          <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-300" />Published Terms</CardTitle></CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            {terms.slice(0, 8).map((term) => (
              <div key={term.assignment_id} className="rounded-xl border border-white/15 bg-white/[0.02] p-3">
                <p className="font-semibold">{term.role_name}</p>
                <p className="text-sm">{term.user_name}</p>
                <p className="text-xs text-muted-foreground">{term.term_start} → {term.term_end}</p>
              </div>
            ))}
            {terms.length === 0 && <p className="text-sm text-muted-foreground">No published terms yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ElectionsPage;

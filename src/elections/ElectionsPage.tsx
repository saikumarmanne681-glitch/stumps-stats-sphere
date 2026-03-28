import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, Gauge, Vote, Users } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { canContestElection, canManageElections, canVoteInElection, getActorId, getActorName } from '@/lib/accessControl';
import { useToast } from '@/hooks/use-toast';
import { electionService } from './electionService';
import { NominationRecord } from './types';
import { electionRoleResponsibilities } from '@/lib/workflowStatus';
import { v2api } from '@/lib/v2api';
import { ClosedAccessScreen } from '@/components/ClosedAccessScreen';
import { parseSheetBoolean } from '@/lib/sheetValueParsers';

const DEFAULT_ROLES = ['President', 'Vice President', 'Secretary', 'Treasurer'];

const nominationStatusLabels = {
  pending: 'Pending with admin approval',
  approved: 'Approved by admin',
  rejected: 'Rejected by admin',
} as const;

const electionStatusLabels = {
  draft: 'Draft',
  open: 'Open for player nominations and voting',
  closed: 'Closed by admin',
} as const;

const ElectionsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [roles, setRoles] = useState(DEFAULT_ROLES.join(', '));
  const [termStart, setTermStart] = useState('');
  const [termEnd, setTermEnd] = useState('');
  const [selectedElectionId, setSelectedElectionId] = useState('');
  const [notificationDate, setNotificationDate] = useState('');
  const [nominationClosingDate, setNominationClosingDate] = useState('');
  const [withdrawalDeadline, setWithdrawalDeadline] = useState('');
  const [pollingDay, setPollingDay] = useState('');
  const [resultsDay, setResultsDay] = useState('');
  const [nominationRole, setNominationRole] = useState('');
  const [manifesto, setManifesto] = useState('');
  const [voteSelections, setVoteSelections] = useState<Record<string, string>>({});
  const [electionsClosed, setElectionsClosed] = useState(false);
  const [electionsClosedReason, setElectionsClosedReason] = useState('');
  const [accessLoading, setAccessLoading] = useState(true);

  useEffect(() => {
    Promise.all([electionService.syncFromBackend(), v2api.getBoardConfiguration()])
      .then(([, boardRows]) => {
        const config = boardRows[0];
        setElectionsClosed(parseSheetBoolean(config?.elections_closed));
        setElectionsClosedReason(config?.elections_closed_reason || '');
      })
      .finally(() => {
        setRefreshKey((value) => value + 1);
        setAccessLoading(false);
      });
  }, []);

  const elections = useMemo(() => electionService.getElections(), [refreshKey]);
  const nominations = useMemo(() => electionService.getNominations(), [refreshKey]);
  const terms = useMemo(() => electionService.getTerms(), [refreshKey]);
  const activeElection = elections.find((item) => item.election_id === selectedElectionId) || elections[0];
  const results = activeElection ? electionService.calculateResults(activeElection.election_id) : [];
  const electionRoles = activeElection ? activeElection.roles_json.split('|').filter(Boolean) : [];
  const approvedNominations = nominations.filter((item) => item.status === 'approved' && item.election_id === activeElection?.election_id);
  const myVotes = activeElection ? electionService.getVotes().filter((vote) => vote.election_id === activeElection.election_id && vote.voter_user_id === getActorId(user)) : [];
  const myNominations = activeElection ? nominations.filter((item) => item.election_id === activeElection.election_id && item.nominee_user_id === getActorId(user)) : [];
  const pendingNominations = activeElection ? nominations.filter((item) => item.election_id === activeElection.election_id && item.status === 'pending') : [];

  const nominationsByRole = electionRoles.reduce<Record<string, NominationRecord[]>>((acc, role) => {
    acc[role] = approvedNominations.filter((item) => item.role_name === role);
    return acc;
  }, {});

  const handleCreateElection = async () => {
    if (!user || !canManageElections(user)) return;
    try {
      await electionService.createElection({
        title,
        description,
        roles_json: roles.split(',').map((item) => item.trim()).filter(Boolean).join('|'),
        eligible_roles_json: 'player',
        status: 'open',
        notification_date: notificationDate || new Date().toISOString(),
        nomination_start: notificationDate || new Date().toISOString(),
        nomination_end: nominationClosingDate || '',
        withdrawal_deadline: withdrawalDeadline || '',
        voting_start: pollingDay || '',
        voting_end: pollingDay || '',
        results_day: resultsDay || '',
        created_by: getActorId(user),
      }, user);
      toast({ title: 'Election created', description: 'The election is now open for player nominations. Only admin can publish results.' });
      setTitle('');
      setDescription('');
      setRoles(DEFAULT_ROLES.join(', '));
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast({ title: 'Unable to create election', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    }
  };

  const handleNominate = async () => {
    if (!activeElection || !user || !canContestElection(user) || !nominationRole || !nominationOpen) return;
    try {
      await electionService.submitNomination({
        election_id: activeElection.election_id,
        role_name: nominationRole,
        nominee_user_id: getActorId(user),
        nominee_name: getActorName(user),
        proposer_user_id: getActorId(user),
        proposer_name: getActorName(user),
        manifesto,
      }, user);
      toast({ title: 'Nomination submitted', description: 'Your nomination has been sent to admin for review.' });
      setManifesto('');
      setNominationRole('');
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast({ title: 'Unable to nominate', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    }
  };

  const handleVote = async () => {
    if (!activeElection || !user || !canVoteInElection(user) || !pollingOpen) return;
    try {
      const selections = Object.fromEntries(Object.entries(voteSelections).filter(([, value]) => !!value).map(([role, nominee]) => {
        const nomination = approvedNominations.find((item) => item.nominee_user_id === nominee && item.role_name === role);
        return [role, { nominee_user_id: nominee, nominee_name: nomination?.nominee_name || nominee }];
      }));
      await electionService.castVotes({ electionId: activeElection.election_id, selections }, user);
      toast({ title: 'Votes submitted', description: 'Your ballot has been recorded. Results will only be visible to admin until publication.' });
      setVoteSelections({});
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast({ title: 'Unable to vote', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    }
  };

  const handlePublish = async () => {
    if (!activeElection || !user || !canManageElections(user) || !termStart || !termEnd) return;
    try {
      await electionService.publishResults(activeElection.election_id, termStart, termEnd, user);
      toast({ title: 'Results published', description: 'Admin has published the election outcome and term assignments.' });
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast({ title: 'Unable to publish', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    }
  };

  const now = new Date();
  const nominationOpen = !!activeElection && (!activeElection.nomination_start || new Date(activeElection.nomination_start) <= now) && (!activeElection.nomination_end || new Date(activeElection.nomination_end) >= now);
  const withdrawalOpen = !!activeElection && (!activeElection.withdrawal_deadline || new Date(activeElection.withdrawal_deadline) >= now);
  const pollingOpen = !!activeElection && (!!activeElection.voting_start || !!activeElection.voting_end) && (!activeElection.voting_start || new Date(activeElection.voting_start) <= now) && (!activeElection.voting_end || new Date(activeElection.voting_end) >= now);

  const electionMetrics = [
    { label: 'Elections managed', value: elections.length, icon: Gauge },
    { label: 'Pending nominations', value: pendingNominations.length, icon: ClipboardCheck },
    { label: 'Approved candidates', value: approvedNominations.length, icon: Users },
    { label: 'Ballots cast by me', value: myVotes.length, icon: Vote },
  ];

  const lifecycleChecklist = [
    { label: 'Notification sent', done: !!activeElection?.notification_date },
    { label: 'Nomination window configured', done: !!activeElection?.nomination_start && !!activeElection?.nomination_end },
    { label: 'Polling day configured', done: !!activeElection?.voting_start },
    { label: 'Result publication date configured', done: !!activeElection?.results_day },
  ];

  if (!user) return <Navigate to="/login" replace />;
  if (user.type === 'management') return <Navigate to="/management" replace />;
  if (!accessLoading && electionsClosed && !canManageElections(user)) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <ClosedAccessScreen
            title="Elections are currently closed"
            reason={electionsClosedReason}
            backHref="/"
            homeHref="/"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Governance Command Center</p>
            <h1 className="font-display text-3xl font-bold">Election Operations Redesign</h1>
            <p className="text-muted-foreground">Complete lifecycle control for nominations, secure voting, tally visibility, and admin publication workflows.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {electionService.getTables().map((table) => <Badge key={table} variant="outline">Table: {table}</Badge>)}
            <Badge variant="secondary">Player ballot eligibility enforced</Badge>
            <Badge variant="outline">Admin-only result publication</Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {electionMetrics.map((metric) => (
            <Card key={metric.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                    <p className="text-3xl font-bold mt-2">{metric.value}</p>
                  </div>
                  <metric.icon className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="operations" className="space-y-4">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 h-auto gap-2 bg-transparent p-0">
            <TabsTrigger value="operations">Election Operations</TabsTrigger>
            <TabsTrigger value="nominations">Candidate Desk</TabsTrigger>
            <TabsTrigger value="voting">Voting & Publication</TabsTrigger>
          </TabsList>

          <TabsContent value="operations" className="space-y-4">
            {canManageElections(user) && (
              <Card>
                <CardHeader><CardTitle>Create Election Blueprint</CardTitle></CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="2026 Club Executive Election" /></div>
                  <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Governance scope, nomination rules, and polling standards" /></div>
                  <div className="space-y-2 md:col-span-2"><Label>Roles</Label><Input value={roles} onChange={(e) => setRoles(e.target.value)} placeholder="President, Vice President, Secretary, Treasurer" /></div>
                  <div className='space-y-2'><Label>Notification date</Label><Input type='date' value={notificationDate} onChange={(e) => setNotificationDate(e.target.value)} /></div>
                  <div className='space-y-2'><Label>Nomination closing date</Label><Input type='date' value={nominationClosingDate} onChange={(e) => setNominationClosingDate(e.target.value)} /></div>
                  <div className='space-y-2'><Label>Withdrawal deadline</Label><Input type='date' value={withdrawalDeadline} onChange={(e) => setWithdrawalDeadline(e.target.value)} /></div>
                  <div className='space-y-2'><Label>Polling day</Label><Input type='date' value={pollingDay} onChange={(e) => setPollingDay(e.target.value)} /></div>
                  <div className='space-y-2'><Label>Results day</Label><Input type='date' value={resultsDay} onChange={(e) => setResultsDay(e.target.value)} /></div>
                  <Button onClick={handleCreateElection} disabled={!title.trim()} className="md:col-span-2">Launch Election Workflow</Button>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
              <Card>
                <CardHeader><CardTitle>Election Portfolio</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {elections.length === 0 && <p className="text-sm text-muted-foreground">No elections created yet.</p>}
                  {elections.map((item) => (
                    <button key={item.election_id} className={`w-full rounded-lg border p-4 text-left ${activeElection?.election_id === item.election_id ? 'border-primary bg-primary/5' : ''}`} onClick={() => setSelectedElectionId(item.election_id)}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-semibold">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.description || 'No description provided.'}</p>
                        </div>
                        <Badge variant={item.status === 'open' ? 'default' : 'secondary'}>{electionStatusLabels[item.status]}</Badge>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Lifecycle Readiness</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {lifecycleChecklist.map((item) => (
                    <div key={item.label} className="rounded-lg border p-3 flex items-center justify-between gap-2">
                      <p className="text-sm">{item.label}</p>
                      <Badge variant={item.done ? 'default' : 'secondary'}>{item.done ? 'Ready' : 'Pending'}</Badge>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">Use this checklist to avoid incomplete election publishing.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="nominations" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Role responsibilities</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {electionRoleResponsibilities.map((item) => (
                  <div key={item.role} className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{item.role}</p>
                      <Badge variant="outline">{item.designation}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.responsibilities}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {canContestElection(user) && activeElection && (
              <Card>
                <CardHeader><CardTitle>Nomination workspace</CardTitle></CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Select role</Label>
                    <select className="h-10 rounded-md border bg-background px-3 text-sm w-full" value={nominationRole} onChange={(e) => setNominationRole(e.target.value)}>
                      <option value="">Choose role</option>
                      {electionRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                    <Badge variant={nominationOpen ? 'default' : 'secondary'}>Nominations {nominationOpen ? 'Open' : 'Closed'}</Badge>
                    <Badge variant={withdrawalOpen ? 'secondary' : 'outline'}>Withdrawal {withdrawalOpen ? 'Allowed' : 'Closed'}</Badge>
                  </div>
                  <div className="space-y-2">
                    <Label>Manifesto</Label>
                    <Textarea value={manifesto} onChange={(e) => setManifesto(e.target.value)} placeholder="State your plans and commitments for this role" />
                    <Button onClick={handleNominate} disabled={!nominationRole || !manifesto.trim() || !nominationOpen}>Submit Nomination</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>Nomination board</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {electionRoles.map((role) => (
                  <div key={role} className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{role}</p>
                      <Badge variant="outline">{nominationsByRole[role]?.length || 0} approved</Badge>
                    </div>
                    {(nominationsByRole[role] || []).map((nomination) => (
                      <div key={nomination.nomination_id} className="rounded border bg-muted/20 p-3">
                        <p className="font-medium">{nomination.nominee_name}</p>
                        <p className="text-xs text-muted-foreground">{nomination.manifesto || 'No manifesto submitted.'}</p>
                      </div>
                    ))}
                    {(nominationsByRole[role] || []).length === 0 && <p className="text-sm text-muted-foreground">No approved candidates yet.</p>}
                  </div>
                ))}

                {myNominations.length > 0 && (
                  <div className="rounded-lg border p-4 space-y-2">
                    <p className="font-semibold">My nominations</p>
                    {myNominations.map((nomination) => (
                      <div key={nomination.nomination_id} className="flex items-center justify-between gap-2 rounded border p-2">
                        <p className="text-sm">{nomination.role_name}</p>
                        <Badge variant={nomination.status === 'approved' ? 'default' : nomination.status === 'rejected' ? 'destructive' : 'secondary'}>{nominationStatusLabels[nomination.status]}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="voting" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Voting desk</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant={pollingOpen ? 'default' : 'secondary'}>Polling {pollingOpen ? 'Open' : 'Closed'}</Badge>
                  <Badge variant="outline">Approved candidates: {approvedNominations.length}</Badge>
                </div>
                {canVoteInElection(user) && activeElection && (
                  <div className="space-y-3">
                    {electionRoles.map((role) => (
                      <div key={role} className="space-y-1">
                        <Label>{role}</Label>
                        <select className="h-10 rounded-md border bg-background px-3 text-sm w-full" value={voteSelections[role] || ''} onChange={(e) => setVoteSelections((prev) => ({ ...prev, [role]: e.target.value }))}>
                          <option value="">Select candidate</option>
                          {(nominationsByRole[role] || []).map((nomination) => (
                            <option key={nomination.nomination_id} value={nomination.nominee_user_id}>{nomination.nominee_name}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                    <Button onClick={handleVote} disabled={!pollingOpen}>Submit Ballot</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Result publication center</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {canManageElections(user) ? (
                  <>
                    {results.map((entry) => (
                      <div key={entry.role_name} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold">{entry.role_name}</p>
                          <Badge>{entry.total_votes} votes</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Leader: {entry.winner_name}</p>
                      </div>
                    ))}
                    {results.length === 0 && <p className="text-sm text-muted-foreground">No approved votes available yet.</p>}
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="space-y-2"><Label>Term start</Label><Input type="date" value={termStart} onChange={(e) => setTermStart(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Term end</Label><Input type="date" value={termEnd} onChange={(e) => setTermEnd(e.target.value)} /></div>
                    </div>
                    <Button onClick={handlePublish} disabled={!termStart || !termEnd}><CheckCircle2 className="h-4 w-4 mr-1" />Publish official results</Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Results are published by admin after validation and term assignment.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader><CardTitle>Current published terms</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {terms.slice(0, 8).map((term) => (
              <div key={term.assignment_id} className="rounded-lg border p-3">
                <p className="font-semibold">{term.role_name}</p>
                <p className="text-sm text-muted-foreground">{term.user_name}</p>
                <p className="text-xs text-muted-foreground">{term.term_start} → {term.term_end}</p>
              </div>
            ))}
            {terms.length === 0 && <p className="text-sm text-muted-foreground">No published assignments yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ElectionsPage;

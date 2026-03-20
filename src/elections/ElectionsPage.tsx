import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { canContestElection, canManageElections, canVoteInElection, getActorId, getActorName } from '@/lib/accessControl';
import { useToast } from '@/hooks/use-toast';
import { electionService } from './electionService';
import { NominationRecord } from './types';
import { electionRoleResponsibilities } from '@/lib/workflowStatus';
import { ActionLoader } from '@/components/LoadingOverlay';
import { LottieMotion } from '@/components/LottieMotion';
import { CheckCircle2, Clock3, ShieldCheck, Sparkles, Vote, Wand2 } from 'lucide-react';

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
  const [nominationRole, setNominationRole] = useState('');
  const [manifesto, setManifesto] = useState('');
  const [voteSelections, setVoteSelections] = useState<Record<string, string>>({});
  const [activeAction, setActiveAction] = useState<string | null>(null);

  useEffect(() => {
    electionService.syncFromBackend().finally(() => setRefreshKey((value) => value + 1));
  }, []);

  if (!user) return <Navigate to="/login" replace />;

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

  const runAction = async (key: string, task: () => Promise<void>) => {
    setActiveAction(key);
    try {
      await task();
    } finally {
      setActiveAction(null);
    }
  };

  const handleCreateElection = async () => {
    if (!user || !canManageElections(user)) return;
    await runAction('create-election', async () => {
      try {
        await electionService.createElection({
          title,
          description,
          roles_json: roles.split(',').map((item) => item.trim()).filter(Boolean).join('|'),
          eligible_roles_json: 'player',
          status: 'open',
          nomination_start: new Date().toISOString(),
          nomination_end: '',
          voting_start: new Date().toISOString(),
          voting_end: '',
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
    });
  };

  const handleNominate = async () => {
    if (!activeElection || !user || !canContestElection(user) || !nominationRole) return;
    await runAction('submit-nomination', async () => {
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
    });
  };

  const handleVote = async () => {
    if (!activeElection || !user || !canVoteInElection(user)) return;
    await runAction('submit-vote', async () => {
      try {
        const selections = Object.fromEntries(Object.entries(voteSelections).filter(([, value]) => !!value).map(([role, nominee]) => {
          const nomination = approvedNominations.find((item) => item.nominee_user_id === nominee && item.role_name === role);
          return [role, { nominee_user_id: nominee, nominee_name: nomination?.nominee_name || nominee }];
        }));
        await electionService.castVotes({ electionId: activeElection.election_id, selections }, user);
        toast({ title: 'Votes submitted', description: 'Your ballot has been recorded. Results remain hidden until admin publishes them.' });
        setVoteSelections({});
        setRefreshKey((value) => value + 1);
      } catch (error) {
        toast({ title: 'Unable to vote', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
      }
    });
  };

  const handlePublish = async () => {
    if (!activeElection || !user || !canManageElections(user) || !termStart || !termEnd) return;
    await runAction('publish-results', async () => {
      try {
        await electionService.publishResults(activeElection.election_id, termStart, termEnd, user);
        toast({ title: 'Results published', description: 'Admin has published the election outcome and term assignments.' });
        setRefreshKey((value) => value + 1);
      } catch (error) {
        toast({ title: 'Unable to publish', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
      }
    });
  };

  const handleReview = async (nominationId: string, status: 'approved' | 'rejected') => {
    if (!user) return;
    await runAction(`${status}-${nominationId}`, async () => {
      try {
        await electionService.reviewNomination(nominationId, status, user);
        setRefreshKey((value) => value + 1);
        toast({ title: `Nomination ${status}`, description: `The candidate can now see that the request is ${status}.` });
      } catch (error) {
        toast({ title: 'Review failed', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
      }
    });
  };

  const participationNotice = user.type === 'player'
    ? 'Players can submit nominations, wait for admin approval, and vote in open elections.'
    : user.type === 'admin'
      ? 'Admin can create elections, approve or reject nominations, view vote results, and publish final results.'
      : 'Management accounts cannot submit nominations or participate in player-only elections.';

  const hasVoteSelections = Object.values(voteSelections).some(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto space-y-6 px-4 py-8">
        <section className="page-shell hero-gradient p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.25fr,0.75fr] lg:items-center">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Governance cockpit</Badge>
                <Badge variant="outline">Duplicate-safe actions</Badge>
                <Badge variant="outline">Pending owner visibility</Badge>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.32em] text-muted-foreground">Election operations</p>
                <h1 className="font-display text-4xl font-bold">Colorful, secure election workflow</h1>
                <p className="mt-2 max-w-2xl text-muted-foreground">The election experience now blocks duplicate clicks, shows exactly who owns the next action, and keeps every nomination, review, vote, and publication step visibly traceable.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="metric-tile">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Open elections</p>
                  <p className="mt-2 text-3xl font-bold text-primary">{elections.filter((item) => item.status === 'open').length}</p>
                </div>
                <div className="metric-tile">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Pending nominations</p>
                  <p className="mt-2 text-3xl font-bold text-amber-500">{pendingNominations.length}</p>
                  <p className="text-xs text-muted-foreground">Pending with admin</p>
                </div>
                <div className="metric-tile">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Published terms</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-500">{terms.length}</p>
                </div>
              </div>
              {activeAction && <ActionLoader text="Saving your election action safely..." />}
            </div>
            <LottieMotion variant="dashboard" className="min-h-[240px]" />
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.25fr,0.75fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Election access policy</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="metric-tile">
                <p className="text-sm font-semibold">Who can create elections?</p>
                <p className="mt-1 text-sm text-muted-foreground">Only admin can create an election and open the nomination process.</p>
              </div>
              <div className="metric-tile">
                <p className="text-sm font-semibold">Who can participate?</p>
                <p className="mt-1 text-sm text-muted-foreground">Only players can submit nominations and vote after admin approval.</p>
              </div>
              <div className="metric-tile">
                <p className="text-sm font-semibold">Who sees pending work?</p>
                <p className="mt-1 text-sm text-muted-foreground">Every status chip now calls out the owner of the next step, so blockers are obvious.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-accent" /> Participation guidance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{participationNotice}</p>
              <div className="rounded-[1.25rem] border border-primary/10 bg-primary/5 p-4 text-sm">
                <p className="font-semibold">Active election owner</p>
                <p className="mt-1 text-muted-foreground">{activeElection?.status === 'closed' ? 'Admin already published the result for this election.' : pendingNominations.length > 0 ? 'Nominations are currently pending with admin.' : 'Players can proceed with nominations and voting.'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" /> Role responsibilities & designations</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {electionRoleResponsibilities.map((item) => (
              <div key={item.role} className="metric-tile space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{item.role}</p>
                  <Badge variant="outline">{item.designation}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.responsibilities}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {canManageElections(user) && (
          <Card>
            <CardHeader><CardTitle>Create election</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="2026 Club Executive Election" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Player nominations are reviewed by admin before they become eligible for voting." />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Roles</Label>
                <Input value={roles} onChange={(e) => setRoles(e.target.value)} placeholder="President, Vice President, Secretary, Treasurer" />
              </div>
              <Button onClick={handleCreateElection} disabled={!title.trim()} loading={activeAction === 'create-election'} loadingText="Creating election...">Create election</Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <Card>
            <CardHeader><CardTitle>Election registry</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {elections.length === 0 && <p className="text-sm text-muted-foreground">No elections created yet.</p>}
              {elections.map((item) => (
                <button key={item.election_id} className={`w-full rounded-[1.4rem] border p-4 text-left transition hover:-translate-y-0.5 ${activeElection?.election_id === item.election_id ? 'border-primary bg-primary/10 shadow-lg' : 'border-white/70 bg-white/70'}`} onClick={() => setSelectedElectionId(item.election_id)}>
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
            <CardHeader><CardTitle>Current terms</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {terms.slice(0, 8).map((term) => (
                <div key={term.assignment_id} className="metric-tile space-y-1">
                  <p className="font-semibold">{term.role_name}</p>
                  <p className="text-sm text-muted-foreground">{term.user_name}</p>
                  <p className="text-xs text-muted-foreground">{term.term_start} → {term.term_end}</p>
                </div>
              ))}
              {terms.length === 0 && <p className="text-sm text-muted-foreground">No published assignments yet.</p>}
            </CardContent>
          </Card>
        </div>

        {activeElection && (
          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader><CardTitle className="flex items-center gap-2"><Vote className="h-5 w-5 text-primary" /> Nomination & voting</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                {user.type === 'player' && canContestElection(user) ? (
                  <div className="rounded-[1.5rem] border border-primary/10 bg-primary/5 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">Submit nomination</p>
                      <Badge variant="secondary">Duplicate-safe submit</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Players can apply for one of the election roles below. Your nomination stays pending with admin until review.</p>
                    <Input value={nominationRole} onChange={(e) => setNominationRole(e.target.value)} list="election-roles" placeholder="Role name" />
                    <datalist id="election-roles">
                      {electionRoles.map((role) => <option key={role} value={role} />)}
                    </datalist>
                    <Textarea value={manifesto} onChange={(e) => setManifesto(e.target.value)} placeholder="Manifesto / candidate note" />
                    <Button onClick={handleNominate} disabled={!nominationRole.trim()} loading={activeAction === 'submit-nomination'} loadingText="Submitting nomination...">Submit nomination</Button>
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] border border-amber-400/30 bg-amber-300/10 p-4 text-sm text-muted-foreground">{participationNotice}</div>
                )}

                {user.type === 'player' && (
                  <div className="space-y-3">
                    <p className="font-semibold">My nomination status</p>
                    {myNominations.length === 0 && <p className="text-sm text-muted-foreground">You have not submitted a nomination for this election yet.</p>}
                    {myNominations.map((item) => (
                      <div key={item.nomination_id} className="rounded-[1.25rem] border p-4 flex items-center justify-between gap-3 flex-wrap bg-white/70">
                        <div>
                          <p className="font-medium">{item.role_name}</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.manifesto || 'No manifesto provided.'}</p>
                          <p className="mt-2 text-xs text-muted-foreground">Action owner: {item.status === 'pending' ? 'Admin' : item.status === 'approved' ? 'Player can campaign and receive votes' : 'Player can edit and resubmit later'}</p>
                        </div>
                        <Badge variant={item.status === 'approved' ? 'default' : item.status === 'rejected' ? 'destructive' : 'secondary'}>
                          {nominationStatusLabels[item.status]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-semibold">Approved nominees for voting</p>
                    {canVoteInElection(user) && <Badge variant="outline">Ballot owner: Player until submit</Badge>}
                  </div>
                  {electionRoles.map((role) => (
                    <div key={role} className="rounded-[1.35rem] border p-4 space-y-3 bg-white/65">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-medium">{role}</p>
                        {myVotes.some((vote) => vote.role_name === role) ? <Badge><CheckCircle2 className="h-3.5 w-3.5" /> Voted</Badge> : <Badge variant="outline"><Clock3 className="h-3.5 w-3.5" /> Pending with player</Badge>}
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {(nominationsByRole[role] || []).map((nomination) => (
                          <label key={nomination.nomination_id} className="rounded-[1.2rem] border p-3 flex items-start gap-3 cursor-pointer bg-white/80">
                            <input
                              type="radio"
                              name={`vote-${role}`}
                              className="mt-1"
                              disabled={myVotes.some((vote) => vote.role_name === role) || !canVoteInElection(user) || activeAction === 'submit-vote'}
                              value={nomination.nominee_user_id}
                              checked={voteSelections[role] === nomination.nominee_user_id}
                              onChange={(e) => setVoteSelections((prev) => ({ ...prev, [role]: e.target.value }))}
                            />
                            <div>
                              <p className="font-medium">{nomination.nominee_name}</p>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{nomination.manifesto || 'Manifesto not provided.'}</p>
                            </div>
                          </label>
                        ))}
                        {(nominationsByRole[role] || []).length === 0 && <p className="text-sm text-muted-foreground">No admin-approved nominees yet for this role.</p>}
                      </div>
                    </div>
                  ))}
                  {canVoteInElection(user) && <Button onClick={handleVote} disabled={!hasVoteSelections} loading={activeAction === 'submit-vote'} loadingText="Recording ballot...">Submit secure ballot</Button>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Admin controls</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {canManageElections(user) ? (
                  <>
                    <div className="rounded-[1.5rem] border p-4 space-y-3 bg-white/70">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">Pending nominations</p>
                        <Badge variant="secondary">Pending with admin</Badge>
                      </div>
                      {pendingNominations.length === 0 && <p className="text-sm text-muted-foreground">No nominations are pending with admin for this election.</p>}
                      {pendingNominations.map((item) => (
                        <div key={item.nomination_id} className="rounded-[1.15rem] border p-3 space-y-2 bg-primary/5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-sm font-medium">{item.nominee_name} · {item.role_name}</p>
                            <Badge variant="secondary">Pending with admin approval</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.manifesto || 'No manifesto provided.'}</p>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleReview(item.nomination_id, 'approved')} loading={activeAction === `approved-${item.nomination_id}`} loadingText="Approving...">Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleReview(item.nomination_id, 'rejected')} loading={activeAction === `rejected-${item.nomination_id}`} loadingText="Rejecting...">Reject</Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-[1.5rem] border p-4 space-y-3 bg-white/70">
                      <p className="font-semibold">Results visibility</p>
                      {results.length === 0 && <p className="text-sm text-muted-foreground">No results available yet. Results appear here for admin once votes are cast.</p>}
                      {results.map((result) => (
                        <div key={result.role_name} className="rounded-[1.15rem] border p-4 bg-white/80">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold">{result.role_name}</p>
                            <Badge variant="outline">{result.total_votes} votes</Badge>
                          </div>
                          <p className="mt-2 text-sm">Current leader: <strong>{result.winner_name || 'Pending'}</strong></p>
                          <div className="mt-3 space-y-2">
                            {result.nominees.map((nominee) => (
                              <div key={nominee.nominee_user_id} className="flex items-center justify-between text-sm">
                                <span>{nominee.nominee_name}</span>
                                <span>{nominee.votes}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-[1.5rem] border p-4 space-y-3 bg-white/70">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">Publish results & assign term</p>
                        <Badge variant="outline">Final action owner: Admin</Badge>
                      </div>
                      <Input type="date" value={termStart} onChange={(e) => setTermStart(e.target.value)} />
                      <Input type="date" value={termEnd} onChange={(e) => setTermEnd(e.target.value)} />
                      <Button onClick={handlePublish} disabled={!termStart || !termEnd} loading={activeAction === 'publish-results'} loadingText="Publishing results...">Publish results</Button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed p-4 text-sm text-muted-foreground">Election results are hidden from non-admin accounts. Admin alone can review vote counts and publish the final outcome.</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ElectionsPage;

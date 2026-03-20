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

const DEFAULT_ROLES = ['President', 'Vice President', 'Secretary', 'Treasurer'];

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

  useEffect(() => {
    electionService.syncFromBackend().finally(() => setRefreshKey((value) => value + 1));
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  const elections = useMemo(() => electionService.getElections(), [refreshKey]);
  const nominations = useMemo(() => electionService.getNominations(), [refreshKey]);
  const terms = useMemo(() => electionService.getTerms(), [refreshKey]);
  const activeElection = elections.find((item) => item.election_id === selectedElectionId) || elections[0];
  const results = activeElection ? electionService.calculateResults(activeElection.election_id) : [];
  const approvedNominations = nominations.filter((item) => item.status === 'approved' && item.election_id === activeElection?.election_id);
  const myVotes = activeElection ? electionService.getVotes().filter((vote) => vote.election_id === activeElection.election_id && vote.voter_user_id === getActorId(user)) : [];

  const electionRoles = activeElection ? activeElection.roles_json.split('|').filter(Boolean) : [];
  const nominationsByRole = electionRoles.reduce<Record<string, NominationRecord[]>>((acc, role) => {
    acc[role] = approvedNominations.filter((item) => item.role_name === role);
    return acc;
  }, {});

  const handleCreateElection = async () => {
    if (!user || !canManageElections(user)) return;
    await electionService.createElection({
      title,
      description,
      roles_json: roles.split(',').map((item) => item.trim()).filter(Boolean).join('|'),
      eligible_roles_json: 'admin|player|management',
      status: 'open',
      nomination_start: new Date().toISOString(),
      nomination_end: '',
      voting_start: new Date().toISOString(),
      voting_end: '',
      created_by: getActorId(user),
    }, user);
    toast({ title: 'Election created', description: 'The new election is now open for nominations and voting.' });
    setTitle('');
    setDescription('');
    setRefreshKey((value) => value + 1);
  };

  const handleNominate = async () => {
    if (!activeElection || !user || !canContestElection(user) || !nominationRole) return;
    await electionService.submitNomination({
      election_id: activeElection.election_id,
      role_name: nominationRole,
      nominee_user_id: getActorId(user),
      nominee_name: getActorName(user),
      proposer_user_id: getActorId(user),
      proposer_name: getActorName(user),
      manifesto,
    }, user);
    toast({ title: 'Nomination submitted', description: 'Your nomination is pending approval.' });
    setManifesto('');
    setRefreshKey((value) => value + 1);
  };

  const handleVote = async () => {
    if (!activeElection || !user || !canVoteInElection(user)) return;
    try {
      const selections = Object.fromEntries(Object.entries(voteSelections).filter(([, value]) => !!value).map(([role, nominee]) => {
        const nomination = approvedNominations.find((item) => item.nominee_user_id === nominee && item.role_name === role);
        return [role, { nominee_user_id: nominee, nominee_name: nomination?.nominee_name || nominee }];
      }));
      await electionService.castVotes({ electionId: activeElection.election_id, selections }, user);
      toast({ title: 'Votes submitted', description: 'Your ballot has been stored securely and cannot be changed.' });
      setVoteSelections({});
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast({ title: 'Unable to vote', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    }
  };

  const handlePublish = async () => {
    if (!activeElection || !user || !canManageElections(user) || !termStart || !termEnd) return;
    await electionService.publishResults(activeElection.election_id, termStart, termEnd, user);
    toast({ title: 'Results published', description: 'Winning candidates have been assigned to their terms.' });
    setRefreshKey((value) => value + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Governance</p>
            <h1 className="font-display text-3xl font-bold">Election System</h1>
            <p className="text-muted-foreground">Secure nominations, voting, results, and term assignment for logged-in members only.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {electionService.getTables().map((table) => <Badge key={table} variant="outline">Table: {table}</Badge>)}
          </div>
        </div>

        {canManageElections(user) && (
          <Card>
            <CardHeader><CardTitle>Create Election</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="2026 Club Executive Election" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Election for executive office bearers." />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Roles</Label>
                <Input value={roles} onChange={(e) => setRoles(e.target.value)} placeholder="President, Vice President, Secretary, Treasurer" />
              </div>
              <Button onClick={handleCreateElection} disabled={!title.trim()}>Create Election</Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <Card>
            <CardHeader><CardTitle>Active Elections</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {elections.length === 0 && <p className="text-sm text-muted-foreground">No elections created yet.</p>}
              {elections.map((item) => (
                <button key={item.election_id} className={`w-full rounded-lg border p-4 text-left ${activeElection?.election_id === item.election_id ? 'border-primary bg-primary/5' : ''}`} onClick={() => setSelectedElectionId(item.election_id)}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description || 'No description provided.'}</p>
                    </div>
                    <Badge variant={item.status === 'open' ? 'default' : 'secondary'}>{item.status}</Badge>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Active Terms</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {terms.slice(0, 8).map((term) => (
                <div key={term.assignment_id} className="rounded-lg border p-3">
                  <p className="font-semibold">{term.role_name}</p>
                  <p className="text-sm text-muted-foreground">{term.user_name}</p>
                  <p className="text-xs text-muted-foreground">{term.term_start} → {term.term_end}</p>
                </div>
              ))}
              {terms.length === 0 && <p className="text-sm text-muted-foreground">No active assignments published yet.</p>}
            </CardContent>
          </Card>
        </div>

        {activeElection && (
          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader><CardTitle>Nomination & Voting</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                {canContestElection(user) ? (
                  <div className="rounded-lg border p-4 space-y-3">
                    <p className="font-semibold">Submit nomination</p>
                    <Input value={nominationRole} onChange={(e) => setNominationRole(e.target.value)} list="election-roles" placeholder="Role name" />
                    <datalist id="election-roles">
                      {electionRoles.map((role) => <option key={role} value={role} />)}
                    </datalist>
                    <Textarea value={manifesto} onChange={(e) => setManifesto(e.target.value)} placeholder="Manifesto / candidate note" />
                    <Button onClick={handleNominate} disabled={!nominationRole.trim()}>Submit Nomination</Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">Election Officer accounts can manage the election, but cannot contest or vote.</div>
                )}

                <div className="space-y-3">
                  <p className="font-semibold">Approved nominees</p>
                  {electionRoles.map((role) => (
                    <div key={role} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-medium">{role}</p>
                        {myVotes.some((vote) => vote.role_name === role) && <Badge>Voted</Badge>}
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {(nominationsByRole[role] || []).map((nomination) => (
                          <label key={nomination.nomination_id} className="rounded-lg border p-3 flex items-start gap-3 cursor-pointer">
                            <input
                              type="radio"
                              name={`vote-${role}`}
                              className="mt-1"
                              disabled={myVotes.some((vote) => vote.role_name === role) || !canVoteInElection(user)}
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
                      </div>
                    </div>
                  ))}
                  {canVoteInElection(user) && <Button onClick={handleVote}>Submit Secure Ballot</Button>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Results & Controls</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {results.map((result) => (
                  <div key={result.role_name} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{result.role_name}</p>
                      <Badge variant="outline">{result.total_votes} votes</Badge>
                    </div>
                    <p className="mt-2 text-sm">Winner: <strong>{result.winner_name || 'Pending'}</strong></p>
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

                {canManageElections(user) && activeElection && (
                  <div className="rounded-lg border p-4 space-y-3">
                    <p className="font-semibold">Publish results & assign term</p>
                    <Input type="date" value={termStart} onChange={(e) => setTermStart(e.target.value)} />
                    <Input type="date" value={termEnd} onChange={(e) => setTermEnd(e.target.value)} />
                    <Button onClick={handlePublish} disabled={!termStart || !termEnd}>Publish Results</Button>
                  </div>
                )}

                {canManageElections(user) && (
                  <div className="rounded-lg border p-4 space-y-2">
                    <p className="font-semibold">Pending nominations</p>
                    {nominations.filter((item) => item.election_id === activeElection.election_id && item.status === 'pending').map((item) => (
                      <div key={item.nomination_id} className="rounded border p-3 space-y-2">
                        <p className="text-sm font-medium">{item.nominee_name} · {item.role_name}</p>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={async () => { await electionService.reviewNomination(item.nomination_id, 'approved', user); setRefreshKey((value) => value + 1); }}>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={async () => { await electionService.reviewNomination(item.nomination_id, 'rejected', user); setRefreshKey((value) => value + 1); }}>Reject</Button>
                        </div>
                      </div>
                    ))}
                  </div>
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

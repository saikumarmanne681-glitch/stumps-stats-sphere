import { useMemo, useState, type ChangeEvent } from 'react';
import { useData } from '@/lib/DataContext';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { buildApprovalPayload, buildPlayerReviews, createEmptyImportDraft, createMatchDraft, ScorecardImportDraft, storePlayerCorrections } from '@/lib/pdfScorecardImport';
import { FileUp, Sparkles, Users, ClipboardCheck, Upload, AlertTriangle } from 'lucide-react';
import { logAudit } from '@/lib/v2api';

const stepTitles = [
  'Upload PDFs',
  'Tournament & Season',
  'Players Review',
  'Match Scorecards',
  'Final Approval',
];

export function PdfScorecardImportWizard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    tournaments,
    seasons,
    players,
    addTournament,
    addSeason,
    addPlayer,
    addMatch,
    addBattingEntry,
    addBowlingEntry,
    refresh,
  } = useData();

  const [draft, setDraft] = useState<ScorecardImportDraft>(() => createEmptyImportDraft());
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);


  const parsedSummary = useMemo(() => {
    const payload = buildApprovalPayload({ draft, tournaments, seasons, players });
    return payload;
  }, [draft, tournaments, seasons, players]);

  const hasTournamentSelection = draft.tournament_mode === 'existing' ? Boolean(draft.tournament_id) : Boolean(draft.new_tournament_name.trim());
  const hasSeasonSelection = draft.season_mode === 'existing' ? Boolean(draft.season_id) : Boolean(draft.new_season_year && draft.new_season_start_date && draft.new_season_end_date);
  const canMoveToPlayers = draft.matches.length > 0 && hasTournamentSelection && hasSeasonSelection;
  const canMoveToMatches = draft.player_reviews.length > 0;
  const canApprove = parsedSummary.matches.length > 0 && parsedSummary.battingEntries.length > 0 && parsedSummary.bowlingEntries.length > 0 && hasTournamentSelection && hasSeasonSelection;

  const displayPlayerName = (playerId: string) => {
    const existing = players.find((player) => player.player_id === playerId)?.name;
    if (existing) return existing;
    const created = parsedSummary.playersToCreate.find((player) => player.player_id === playerId)?.name;
    return created || playerId;
  };

  const setMatchField = (draftId: string, field: string, value: string) => {
    setDraft((current) => ({
      ...current,
      matches: current.matches.map((match) => (match.draft_id === draftId ? { ...match, [field]: value } : match)),
    }));
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) => /\.pdf$/i.test(file.name));
    if (files.length === 0) {
      toast({ title: 'Please select PDF files only', variant: 'destructive' });
      return;
    }

    setDraft((current) => ({
      ...current,
      uploaded_files: files.map((file) => ({
        id: `${file.name}-${file.size}`,
        name: file.name,
        size: file.size,
        uploaded_at: new Date().toISOString(),
      })),
      matches: files.map((file) => createMatchDraft(file)),
      player_reviews: [],
      needs_user_review: true,
    }));
    setStep(1);
  };

  const refreshPlayers = () => {
    setDraft((current) => ({
      ...current,
      player_reviews: buildPlayerReviews(current.matches, players),
    }));
  };

  const handleApprove = async () => {
    if (!canApprove) {
      toast({ title: 'Add at least one fully reviewed match with batting and bowling rows', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      storePlayerCorrections(draft.player_reviews);
      const payload = buildApprovalPayload({ draft, tournaments, seasons, players });
      const tournamentExists = tournaments.some((item) => item.tournament_id === payload.tournament.tournament_id);
      const seasonExists = seasons.some((item) => item.season_id === payload.season.season_id);

      if (!tournamentExists) await addTournament(payload.tournament);
      if (!seasonExists) await addSeason(payload.season);
      for (const player of payload.playersToCreate) await addPlayer(player);
      for (const match of payload.matches) await addMatch(match);
      for (const battingEntry of payload.battingEntries) await addBattingEntry(battingEntry);
      for (const bowlingEntry of payload.bowlingEntries) await addBowlingEntry(bowlingEntry);
      await refresh();

      logAudit(
        user?.management_id || user?.username || 'admin',
        'approve_pdf_scorecard_import',
        'scorecard_import',
        draft.draft_id,
        JSON.stringify({
          uploadedFiles: draft.uploaded_files.map((file) => file.name),
          matches: payload.matches.length,
          newPlayers: payload.playersToCreate.length,
          tournament: payload.tournament.name,
          season: payload.season.year,
        }),
      );

      setDraft(createEmptyImportDraft());
      setStep(0);
      toast({ title: 'PDF scorecard draft approved', description: 'Matches, players, batting, and bowling data were written after your final review.' });
    } catch (error) {
      toast({
        title: 'Import approval failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileUp className="h-5 w-5" /> PDF Scorecard Intake</CardTitle>
        <CardDescription>
          Upload scorelist PDFs, answer tournament and season questions, review extracted player names, then approve the full scorecard only when you are satisfied.
          100% accuracy still depends on human review, especially for handwritten or OCR-based scorecards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-5">
          {stepTitles.map((title, index) => (
            <div key={title} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{title}</span>
                <Badge variant={index === step ? 'default' : index < step ? 'secondary' : 'outline'}>Step {index + 1}</Badge>
              </div>
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-dashed p-6 text-center">
              <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Choose one or more PDF scorelists. Each PDF starts a review draft and nothing goes to sheets until final approval.</p>
              <Input className="mt-4" type="file" accept="application/pdf" multiple onChange={handleFileUpload} />
            </div>
            <div className="rounded-lg border bg-amber-50 p-4 text-sm text-amber-900">
              <div className="flex gap-2 font-medium"><AlertTriangle className="mt-0.5 h-4 w-4" /> Accuracy note</div>
              <p className="mt-2">Text PDFs can help speed entry, but handwritten scans still require manual verification. This workflow intentionally blocks writes to sheets/UI until you explicitly approve the reviewed data.</p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Which tournament should this scorecard use?</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Select value={draft.tournament_mode} onValueChange={(value: 'existing' | 'new') => setDraft((current) => ({ ...current, tournament_mode: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="existing">Use existing tournament</SelectItem>
                      <SelectItem value="new">Add new tournament</SelectItem>
                    </SelectContent>
                  </Select>
                  {draft.tournament_mode === 'existing' ? (
                    <Select value={draft.tournament_id} onValueChange={(value) => setDraft((current) => ({ ...current, tournament_id: value }))}>
                      <SelectTrigger><SelectValue placeholder="Select tournament" /></SelectTrigger>
                      <SelectContent>
                        {tournaments.map((tournament) => <SelectItem key={tournament.tournament_id} value={tournament.tournament_id}>{tournament.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="grid gap-3">
                      <Input placeholder="New tournament name" value={draft.new_tournament_name} onChange={(event) => setDraft((current) => ({ ...current, new_tournament_name: event.target.value }))} />
                      <Input placeholder="Format" value={draft.new_tournament_format} onChange={(event) => setDraft((current) => ({ ...current, new_tournament_format: event.target.value }))} />
                      <Input placeholder="Overs" type="number" value={draft.new_tournament_overs} onChange={(event) => setDraft((current) => ({ ...current, new_tournament_overs: Number(event.target.value) || 0 }))} />
                      <Textarea placeholder="Description" value={draft.new_tournament_description} onChange={(event) => setDraft((current) => ({ ...current, new_tournament_description: event.target.value }))} />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">What season should be linked to this scorecard?</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Select value={draft.season_mode} onValueChange={(value: 'existing' | 'new') => setDraft((current) => ({ ...current, season_mode: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="existing">Use existing season</SelectItem>
                      <SelectItem value="new">Add new season</SelectItem>
                    </SelectContent>
                  </Select>
                  {draft.season_mode === 'existing' ? (
                    <Select value={draft.season_id} onValueChange={(value) => setDraft((current) => ({ ...current, season_id: value }))}>
                      <SelectTrigger><SelectValue placeholder="Select season" /></SelectTrigger>
                      <SelectContent>
                        {seasons.map((season) => <SelectItem key={season.season_id} value={season.season_id}>{season.year} • {season.status}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input placeholder="Season label" value={draft.new_season_name} onChange={(event) => setDraft((current) => ({ ...current, new_season_name: event.target.value }))} />
                      <Input placeholder="Season year" type="number" value={draft.new_season_year} onChange={(event) => setDraft((current) => ({ ...current, new_season_year: Number(event.target.value) || new Date().getFullYear() }))} />
                      <Input placeholder="Start date" type="date" value={draft.new_season_start_date} onChange={(event) => setDraft((current) => ({ ...current, new_season_start_date: event.target.value }))} />
                      <Input placeholder="End date" type="date" value={draft.new_season_end_date} onChange={(event) => setDraft((current) => ({ ...current, new_season_end_date: event.target.value }))} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={() => { refreshPlayers(); setStep(2); }} disabled={!canMoveToPlayers}>Continue to player review</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold"><Users className="h-5 w-5" /> Unique players extracted from your draft</h3>
                <p className="text-sm text-muted-foreground">Correct any names here. Your corrections are stored and reused for future imports on this browser.</p>
              </div>
              <Button variant="outline" onClick={refreshPlayers}><Sparkles className="mr-2 h-4 w-4" /> Re-extract players</Button>
            </div>

            <div className="space-y-3">
              {draft.player_reviews.length === 0 && <p className="text-sm text-muted-foreground">No players found yet. Add batting and bowling lines in the next step, then return here.</p>}
              {draft.player_reviews.map((review, index) => (
                <div key={`${review.source_name}-${index}`} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1.2fr_1.2fr_0.8fr_0.8fr_auto]">
                  <div>
                    <Label>Source name</Label>
                    <Input value={review.source_name} disabled />
                  </div>
                  <div>
                    <Label>Corrected / confirmed name</Label>
                    <Input value={review.corrected_name} onChange={(event) => setDraft((current) => ({
                      ...current,
                      player_reviews: current.player_reviews.map((item, itemIndex) => itemIndex === index ? { ...item, corrected_name: event.target.value } : item),
                    }))} />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={review.role} onValueChange={(value: typeof review.role) => setDraft((current) => ({
                      ...current,
                      player_reviews: current.player_reviews.map((item, itemIndex) => itemIndex === index ? { ...item, role: value } : item),
                    }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="batsman">Batsman</SelectItem>
                        <SelectItem value="bowler">Bowler</SelectItem>
                        <SelectItem value="allrounder">Allrounder</SelectItem>
                        <SelectItem value="wicketkeeper">Wicketkeeper</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={review.status} onValueChange={(value: typeof review.status) => setDraft((current) => ({
                      ...current,
                      player_reviews: current.player_reviews.map((item, itemIndex) => itemIndex === index ? { ...item, status: value } : item),
                    }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Badge variant={review.is_new ? 'secondary' : 'outline'}>{review.is_new ? 'New player' : 'Existing player'}</Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} disabled={!canMoveToMatches}>Continue to match review</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold"><ClipboardCheck className="h-5 w-5" /> Complete matches list with batting and bowling</h3>
              <p className="text-sm text-muted-foreground">Review inside the UI before approval. Use the line format examples in each box. Nothing is persisted until the final approve button is clicked.</p>
            </div>
            {draft.matches.map((match) => (
              <Card key={match.draft_id}>
                <CardHeader>
                  <CardTitle className="text-base">{match.source_pdf_name}</CardTitle>
                  <CardDescription>One uploaded PDF maps to one match draft in this review flow.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <Input placeholder="Date" type="date" value={match.date} onChange={(event) => setMatchField(match.draft_id, 'date', event.target.value)} />
                    <Input placeholder="Team A" value={match.team_a} onChange={(event) => setMatchField(match.draft_id, 'team_a', event.target.value)} />
                    <Input placeholder="Team B" value={match.team_b} onChange={(event) => setMatchField(match.draft_id, 'team_b', event.target.value)} />
                    <Input placeholder="Venue" value={match.venue} onChange={(event) => setMatchField(match.draft_id, 'venue', event.target.value)} />
                    <Input placeholder="Toss winner" value={match.toss_winner} onChange={(event) => setMatchField(match.draft_id, 'toss_winner', event.target.value)} />
                    <Input placeholder="Toss decision" value={match.toss_decision} onChange={(event) => setMatchField(match.draft_id, 'toss_decision', event.target.value)} />
                    <Input placeholder="Result" value={match.result} onChange={(event) => setMatchField(match.draft_id, 'result', event.target.value)} />
                    <Input placeholder="Player of the match" value={match.man_of_match} onChange={(event) => setMatchField(match.draft_id, 'man_of_match', event.target.value)} />
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <Label>Batting lines</Label>
                      <Textarea className="min-h-[220px] font-mono text-xs" value={match.batting_text} onChange={(event) => setMatchField(match.draft_id, 'batting_text', event.target.value)} />
                    </div>
                    <div>
                      <Label>Bowling lines</Label>
                      <Textarea className="min-h-[220px] font-mono text-xs" value={match.bowling_text} onChange={(event) => setMatchField(match.draft_id, 'bowling_text', event.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={() => { refreshPlayers(); setStep(4); }}>Continue to approval</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div className="rounded-xl border bg-slate-50 p-4">
              <h3 className="text-lg font-semibold">Final review summary</h3>
              <p className="mt-1 text-sm text-muted-foreground">Approve only after you review the draft data in this UI. Before approval, nothing is written to Google Sheets or reflected in the live UI datasets.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Uploaded PDFs</p><p className="text-2xl font-semibold">{draft.uploaded_files.length}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Matches</p><p className="text-2xl font-semibold">{parsedSummary.matches.length}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Batting rows</p><p className="text-2xl font-semibold">{parsedSummary.battingEntries.length}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Bowling rows</p><p className="text-2xl font-semibold">{parsedSummary.bowlingEntries.length}</p></CardContent></Card>
            </div>

            <div className="space-y-4">
              {parsedSummary.matches.map((match) => (
                <Card key={match.match_id}>
                  <CardHeader>
                    <CardTitle className="text-base">{match.team_a} vs {match.team_b}</CardTitle>
                    <CardDescription>{match.date || 'Date TBD'} • {match.venue || 'Venue TBD'}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium">Batting</p>
                        <div className="mt-2 space-y-2 text-sm">
                          {parsedSummary.battingEntries.filter((entry) => entry.match_id === match.match_id).map((entry) => (
                            <div key={entry.id} className="rounded border p-2">{entry.team} • {displayPlayerName(entry.player_id)} — {entry.runs} ({entry.balls})</div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Bowling</p>
                        <div className="mt-2 space-y-2 text-sm">
                          {parsedSummary.bowlingEntries.filter((entry) => entry.match_id === match.match_id).map((entry) => (
                            <div key={entry.id} className="rounded border p-2">{entry.team} • {displayPlayerName(entry.player_id)} — {entry.wickets}/{entry.runs_conceded} in {entry.overs}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Separator />
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
              <Button onClick={handleApprove} disabled={saving || !canApprove}>{saving ? 'Approving…' : 'Approve and write to sheets/UI'}</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

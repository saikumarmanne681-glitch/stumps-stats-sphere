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
import { buildApprovalPayload, buildPlayerReviews, createEmptyImportDraft, createMatchDraft, ScorecardImportDraft, ScorecardImportMatchDraft, storePlayerCorrections } from '@/lib/pdfScorecardImport';
import { isKiplFormat, parseKiplText, kiplMatchesToDrafts, KiplMatchExtracted } from '@/lib/kiplPdfParser';
import { FileUp, Sparkles, Users, ClipboardCheck, Upload, AlertTriangle, Eye, Plus, Trash2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { logAudit } from '@/lib/v2api';

const stepTitles = [
  'Upload & Extract',
  'Tournament & Season',
  'Players Review',
  'Match Scorecards',
  'Final Approval',
];

interface ManualMatchEntry {
  id: string;
  team_a: string;
  team_b: string;
  date: string;
  team_a_score: string;
  team_b_score: string;
  match_stage: string;
  venue: string;
  result: string;
  toss_winner: string;
  toss_decision: string;
  man_of_match: string;
  players: {
    name: string;
    team: string;
    runs: number;
    wickets: number;
  }[];
}

function createEmptyManualMatch(): ManualMatchEntry {
  return {
    id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    team_a: '',
    team_b: '',
    date: '',
    team_a_score: '',
    team_b_score: '',
    match_stage: 'League',
    venue: '',
    result: '',
    toss_winner: '',
    toss_decision: '',
    man_of_match: '',
    players: [],
  };
}

function manualMatchToDraft(entry: ManualMatchEntry, pdfName: string): ScorecardImportMatchDraft {
  const battingLines = [
    `# ${entry.team_a} vs ${entry.team_b}`,
    '# Format: Player Name | Team | Runs | Balls | 4s | 6s | How out | Bowler',
  ];
  const bowlingLines = [
    `# ${entry.team_a} vs ${entry.team_b}`,
    '# Format: Player Name | Team | Overs | Maidens | Runs | Wickets | Extras',
  ];

  entry.players.forEach(p => {
    battingLines.push(`${p.name} | ${p.team} | ${p.runs} | 0 | 0 | 0 | not out | `);
    if (p.wickets > 0) {
      bowlingLines.push(`${p.name} | ${p.team} | 0 | 0 | 0 | ${p.wickets} | 0`);
    }
  });

  return {
    draft_id: entry.id,
    source_pdf_id: `${pdfName}-${entry.id}`,
    source_pdf_name: pdfName,
    date: entry.date,
    team_a: entry.team_a,
    team_b: entry.team_b,
    venue: entry.venue,
    result: entry.result,
    toss_winner: entry.toss_winner,
    toss_decision: entry.toss_decision,
    man_of_match: entry.man_of_match,
    match_stage: entry.match_stage,
    status: 'completed',
    batting_text: battingLines.join('\n'),
    bowling_text: bowlingLines.join('\n'),
  };
}

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
  const [extracting, setExtracting] = useState(false);
  const [extractedRawText, setExtractedRawText] = useState('');
  const [extractionResult, setExtractionResult] = useState<'success' | 'partial' | 'failed' | null>(null);
  const [kiplMatches, setKiplMatches] = useState<KiplMatchExtracted[]>([]);
  const [manualMode, setManualMode] = useState(false);
  const [manualEntries, setManualEntries] = useState<ManualMatchEntry[]>([]);
  const [teamNameMapping, setTeamNameMapping] = useState<Record<string, string>>({
    DAY: 'DAYAKAR',
    SAI: 'SAIKUMAR',
    CHA: 'CHANDU',
    OMP: 'OMPRAKASH',
    PRA: 'PRABHAKAR',
  });
  const [pdfFileName, setPdfFileName] = useState('');

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

  const extractTextFromPdf = async (file: File): Promise<string> => {
    // Use FileReader to get text content - for system-generated PDFs
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        // Try to extract meaningful text
        if (text && text.length > 50) {
          resolve(text);
        } else {
          resolve('');
        }
      };
      reader.onerror = () => resolve('');
      reader.readAsText(file);
    });
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) => /\.pdf$/i.test(file.name));
    if (files.length === 0) {
      toast({ title: 'Please select PDF files only', variant: 'destructive' });
      return;
    }

    const file = files[0]; // Process first file
    setPdfFileName(file.name);
    setExtracting(true);
    setExtractionResult(null);

    try {
      // Try text extraction
      const rawText = await extractTextFromPdf(file);
      setExtractedRawText(rawText);

      if (rawText && isKiplFormat(rawText)) {
        // Auto-parse KIPL format
        const extracted = parseKiplText(rawText, teamNameMapping);
        if (extracted.length > 0) {
          setKiplMatches(extracted);
          const drafts = kiplMatchesToDrafts(extracted, file.name, teamNameMapping);
          setDraft(current => ({
            ...current,
            uploaded_files: [{ id: `${file.name}-${file.size}`, name: file.name, size: file.size, uploaded_at: new Date().toISOString() }],
            matches: drafts,
            player_reviews: [],
            needs_user_review: true,
          }));
          setExtractionResult('success');
          setManualMode(false);
          toast({ title: `✅ Extracted ${extracted.length} matches from PDF`, description: 'Please review each match below for accuracy.' });
        } else {
          setExtractionResult('partial');
          setManualMode(true);
          toast({ title: '⚠️ PDF recognized but no matches extracted', description: 'Please enter match data manually below.', variant: 'destructive' });
        }
      } else {
        // Could not auto-detect format - switch to manual
        setExtractionResult('failed');
        setManualMode(true);
        setDraft(current => ({
          ...current,
          uploaded_files: [{ id: `${file.name}-${file.size}`, name: file.name, size: file.size, uploaded_at: new Date().toISOString() }],
          matches: [],
          player_reviews: [],
          needs_user_review: true,
        }));
        toast({
          title: '📝 Could not auto-extract from this PDF',
          description: 'The PDF may be handwritten or in an unsupported format. Please enter data manually.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('PDF extraction error:', error);
      setExtractionResult('failed');
      setManualMode(true);
      toast({ title: 'PDF processing error', description: 'Please enter data manually below.', variant: 'destructive' });
    } finally {
      setExtracting(false);
    }
  };

  const addManualMatch = () => {
    setManualEntries(prev => [...prev, createEmptyManualMatch()]);
  };

  const updateManualEntry = (id: string, field: keyof ManualMatchEntry, value: any) => {
    setManualEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const addPlayerToManualMatch = (matchId: string) => {
    setManualEntries(prev => prev.map(e => {
      if (e.id !== matchId) return e;
      return { ...e, players: [...e.players, { name: '', team: e.team_a || '', runs: 0, wickets: 0 }] };
    }));
  };

  const updateManualPlayer = (matchId: string, playerIdx: number, field: string, value: any) => {
    setManualEntries(prev => prev.map(e => {
      if (e.id !== matchId) return e;
      return { ...e, players: e.players.map((p, i) => i === playerIdx ? { ...p, [field]: value } : p) };
    }));
  };

  const removeManualPlayer = (matchId: string, playerIdx: number) => {
    setManualEntries(prev => prev.map(e => {
      if (e.id !== matchId) return e;
      return { ...e, players: e.players.filter((_, i) => i !== playerIdx) };
    }));
  };

  const removeManualMatch = (matchId: string) => {
    setManualEntries(prev => prev.filter(e => e.id !== matchId));
  };

  const convertManualEntriesToDrafts = () => {
    const drafts = manualEntries
      .filter(e => e.team_a && e.team_b && e.players.length > 0)
      .map(e => manualMatchToDraft(e, pdfFileName || 'manual-entry'));
    
    setDraft(current => ({
      ...current,
      matches: [...current.matches, ...drafts],
      player_reviews: [],
      needs_user_review: true,
    }));
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
      setManualEntries([]);
      setKiplMatches([]);
      setExtractionResult(null);
      setManualMode(false);
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
          Upload KIPL-format scorelist PDFs for auto-extraction. If auto-extraction fails (handwritten/OCR PDFs), you can enter data manually field-by-field. 100% accuracy guaranteed through human review.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step indicator */}
        <div className="grid gap-3 md:grid-cols-5">
          {stepTitles.map((title, index) => (
            <button
              key={title}
              onClick={() => {
                if (index < step) setStep(index);
              }}
              className={`rounded-lg border p-3 text-left transition-colors ${index < step ? 'cursor-pointer hover:bg-accent' : ''} ${index === step ? 'border-primary bg-primary/5' : ''}`}
              disabled={index > step}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{title}</span>
                <Badge variant={index === step ? 'default' : index < step ? 'secondary' : 'outline'}>
                  {index < step ? '✓' : `Step ${index + 1}`}
                </Badge>
              </div>
            </button>
          ))}
        </div>

        {/* ─── STEP 0: Upload & Extract ─── */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-dashed p-6 text-center">
              <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Upload a KIPL-format PDF scorelist. The system will try to auto-extract match data.
                If extraction fails, you'll be asked to enter each field manually.
              </p>
              <Input
                className="mt-4"
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                disabled={extracting}
              />
              {extracting && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting data from PDF…
                </div>
              )}
            </div>

            {/* Extraction result feedback */}
            {extractionResult === 'success' && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                <div className="flex gap-2 font-medium"><CheckCircle2 className="mt-0.5 h-4 w-4" /> Auto-extraction successful</div>
                <p className="mt-2">Found {kiplMatches.length} match(es). Please review the extracted data carefully before proceeding.</p>
                <div className="mt-3 space-y-2">
                  {kiplMatches.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 rounded border bg-white p-2 text-xs">
                      <Badge variant="outline">{m.match_stage}</Badge>
                      <span className="font-medium">{m.team_a_abbr} vs {m.team_b_abbr}</span>
                      <span className="text-muted-foreground">{m.date_raw}</span>
                      <span>{m.team_a_score} — {m.team_b_score}</span>
                      <span className="text-muted-foreground">{m.team1_players.length + m.team2_players.length} players</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {extractionResult === 'partial' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="flex gap-2 font-medium"><AlertTriangle className="mt-0.5 h-4 w-4" /> Partial extraction</div>
                <p className="mt-2">The PDF was recognized but some data couldn't be extracted. Please add missing matches manually below.</p>
              </div>
            )}

            {extractionResult === 'failed' && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                <div className="flex gap-2 font-medium"><XCircle className="mt-0.5 h-4 w-4" /> Auto-extraction failed</div>
                <p className="mt-2">This PDF is likely handwritten or in an unsupported format. Please enter all match data manually below. Each field will be clearly labeled.</p>
              </div>
            )}

            {/* Team name mapping editor */}
            {(extractionResult === 'success' || extractionResult === 'partial') && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Team Abbreviation Mapping</CardTitle>
                  <CardDescription>Map short team codes to full names. These are auto-detected from the PDF.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(teamNameMapping).map(([abbr, name]) => (
                      <div key={abbr} className="flex items-center gap-2">
                        <Badge variant="outline" className="min-w-[3rem] justify-center">{abbr}</Badge>
                        <span className="text-muted-foreground">→</span>
                        <Input
                          value={name}
                          onChange={(e) => setTeamNameMapping(prev => ({ ...prev, [abbr]: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      // Re-parse with updated mapping
                      if (extractedRawText) {
                        const extracted = parseKiplText(extractedRawText, teamNameMapping);
                        setKiplMatches(extracted);
                        const drafts = kiplMatchesToDrafts(extracted, pdfFileName, teamNameMapping);
                        setDraft(current => ({ ...current, matches: drafts }));
                        toast({ title: 'Re-parsed with updated team names' });
                      }
                    }}
                  >
                    <Sparkles className="mr-2 h-3 w-3" /> Re-parse with updated names
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Manual entry section */}
            {(manualMode || extractionResult === 'partial') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardCheck className="h-4 w-4" /> Manual Match Entry
                  </CardTitle>
                  <CardDescription>
                    Add each match one by one. For each match, enter team names, date, scores, and all player stats (Runs scored & Wickets taken).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {manualEntries.map((entry) => (
                    <Card key={entry.id} className="border-dashed">
                      <CardContent className="space-y-4 pt-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">
                            {entry.team_a && entry.team_b ? `${entry.team_a} vs ${entry.team_b}` : 'New Match'}
                          </h4>
                          <Button variant="ghost" size="sm" onClick={() => removeManualMatch(entry.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <Label className="text-xs">Team A Name *</Label>
                            <Input placeholder="e.g. DAYAKAR" value={entry.team_a}
                              onChange={e => updateManualEntry(entry.id, 'team_a', e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-xs">Team B Name *</Label>
                            <Input placeholder="e.g. SAIKUMAR" value={entry.team_b}
                              onChange={e => updateManualEntry(entry.id, 'team_b', e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-xs">Date *</Label>
                            <Input type="date" value={entry.date}
                              onChange={e => updateManualEntry(entry.id, 'date', e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-xs">Match Stage</Label>
                            <Select value={entry.match_stage} onValueChange={v => updateManualEntry(entry.id, 'match_stage', v)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="League">League</SelectItem>
                                <SelectItem value="QF1">QF 1</SelectItem>
                                <SelectItem value="QF2">QF 2</SelectItem>
                                <SelectItem value="QF/Eliminator">QF / Eliminator</SelectItem>
                                <SelectItem value="SF1">Semi Final 1</SelectItem>
                                <SelectItem value="SF2">Semi Final 2</SelectItem>
                                <SelectItem value="Final">Final</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <Label className="text-xs">Team A Score (e.g. 34/3)</Label>
                            <Input placeholder="34/3" value={entry.team_a_score}
                              onChange={e => updateManualEntry(entry.id, 'team_a_score', e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-xs">Team B Score (e.g. 23/3)</Label>
                            <Input placeholder="23/3" value={entry.team_b_score}
                              onChange={e => updateManualEntry(entry.id, 'team_b_score', e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-xs">Result</Label>
                            <Input placeholder="e.g. DAYAKAR won" value={entry.result}
                              onChange={e => updateManualEntry(entry.id, 'result', e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-xs">Man of Match</Label>
                            <Input placeholder="Player name" value={entry.man_of_match}
                              onChange={e => updateManualEntry(entry.id, 'man_of_match', e.target.value)} />
                          </div>
                        </div>

                        {/* Player entries */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs font-medium">Players (Runs scored & Wickets taken)</Label>
                            <Button variant="outline" size="sm" onClick={() => addPlayerToManualMatch(entry.id)}>
                              <Plus className="mr-1 h-3 w-3" /> Add Player
                            </Button>
                          </div>
                          {entry.players.length === 0 && (
                            <p className="text-xs text-muted-foreground py-3 text-center border border-dashed rounded">
                              No players added yet. Click "Add Player" to enter individual player stats.
                            </p>
                          )}
                          <div className="space-y-2">
                            {entry.players.map((p, pi) => (
                              <div key={pi} className="grid grid-cols-[1fr_0.8fr_0.5fr_0.5fr_auto] gap-2 items-end">
                                <div>
                                  <Label className="text-xs">Name</Label>
                                  <Input placeholder="Player name" value={p.name}
                                    onChange={e => updateManualPlayer(entry.id, pi, 'name', e.target.value)}
                                    className="h-8 text-sm" />
                                </div>
                                <div>
                                  <Label className="text-xs">Team</Label>
                                  <Select value={p.team} onValueChange={v => updateManualPlayer(entry.id, pi, 'team', v)}>
                                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Team" /></SelectTrigger>
                                    <SelectContent>
                                      {entry.team_a && <SelectItem value={entry.team_a}>{entry.team_a}</SelectItem>}
                                      {entry.team_b && <SelectItem value={entry.team_b}>{entry.team_b}</SelectItem>}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Runs (R)</Label>
                                  <Input type="number" min={0} value={p.runs}
                                    onChange={e => updateManualPlayer(entry.id, pi, 'runs', parseInt(e.target.value) || 0)}
                                    className="h-8 text-sm" />
                                </div>
                                <div>
                                  <Label className="text-xs">Wickets (W)</Label>
                                  <Input type="number" min={0} value={p.wickets}
                                    onChange={e => updateManualPlayer(entry.id, pi, 'wickets', parseInt(e.target.value) || 0)}
                                    className="h-8 text-sm" />
                                </div>
                                <Button variant="ghost" size="sm" className="h-8" onClick={() => removeManualPlayer(entry.id, pi)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Button variant="outline" onClick={addManualMatch}>
                    <Plus className="mr-2 h-4 w-4" /> Add Another Match
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Accuracy note */}
            <div className="rounded-lg border bg-amber-50 p-4 text-sm text-amber-900">
              <div className="flex gap-2 font-medium"><AlertTriangle className="mt-0.5 h-4 w-4" /> Accuracy note</div>
              <p className="mt-2">
                Auto-extraction works best with system-generated KIPL PDFs. Handwritten scorelists require manual entry.
                Nothing is saved until you review and approve at the final step.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  // Convert manual entries to drafts if in manual mode
                  if (manualMode && manualEntries.length > 0) {
                    convertManualEntriesToDrafts();
                  }
                  setStep(1);
                }}
                disabled={draft.matches.length === 0 && manualEntries.filter(e => e.team_a && e.team_b && e.players.length > 0).length === 0}
              >
                Continue to Tournament & Season
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 1: Tournament & Season ─── */}
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

        {/* ─── STEP 2: Players Review ─── */}
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

        {/* ─── STEP 3: Match Scorecards ─── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold"><ClipboardCheck className="h-5 w-5" /> Complete matches list with batting and bowling</h3>
              <p className="text-sm text-muted-foreground">Review inside the UI before approval. Use the line format examples in each box. Nothing is persisted until the final approve button is clicked.</p>
            </div>
            {draft.matches.map((match) => (
              <Card key={match.draft_id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {match.team_a && match.team_b ? `${match.team_a} vs ${match.team_b}` : match.source_pdf_name}
                  </CardTitle>
                  <CardDescription>
                    {match.date || 'Date TBD'} • {match.match_stage || 'League'}
                    {match.result && ` • ${match.result}`}
                  </CardDescription>
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

        {/* ─── STEP 4: Final Approval ─── */}
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
                    <CardDescription>{match.date || 'Date TBD'} • {match.venue || 'Venue TBD'} • {match.match_stage || 'League'}</CardDescription>
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

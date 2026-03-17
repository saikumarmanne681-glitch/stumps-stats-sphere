import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/DataContext';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { v2api, logAudit } from '@/lib/v2api';
import { DigitalScorelist, CertificationApproval, CERTIFICATION_STAGES } from '@/lib/v2types';
import { verifyScorelist, exportScorelistAsJSON, generateMatchScorelist, generateTournamentScorelist } from '@/lib/scorelist';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileJson, Shield, ShieldCheck, ShieldX, Lock, Unlock, QrCode, Download, Eye } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const AdminScorelistsPage = () => {
  const { isAdmin, user } = useAuth();
  const { matches, batting, bowling, players, tournaments, seasons } = useData();
  const { toast } = useToast();

  const [scorelists, setScorelists] = useState<DigitalScorelist[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState('');
  const [selectedTournament, setSelectedTournament] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [viewScorelist, setViewScorelist] = useState<DigitalScorelist | null>(null);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; reason?: string } | null>(null);

  useEffect(() => {
    v2api.getScorelists().then((s) => {
      setScorelists(s);
      setLoading(false);
    });
  }, []);

  if (!isAdmin) return <Navigate to="/login" />;

  const refresh = async () => {
    const data = await v2api.getScorelists();
    setScorelists(data);
  };

  const handleGenerateMatch = async () => {
    if (!selectedMatch) return;
    setGenerating(true);
    try {
      const match = matches.find(m => m.match_id === selectedMatch);
      if (!match) return;
      const tournament = tournaments.find(t => t.tournament_id === match.tournament_id);
      const season = seasons.find(s => s.season_id === match.season_id);
      await generateMatchScorelist(match, batting, bowling, players, tournament, season, user?.username || 'admin');
      toast({ title: '✅ Match scorelist generated' });
      refresh();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    setGenerating(false);
  };

  const handleGenerateTournament = async () => {
    if (!selectedTournament || !selectedSeason) return;
    setGenerating(true);
    try {
      const tournament = tournaments.find(t => t.tournament_id === selectedTournament)!;
      const season = seasons.find(s => s.season_id === selectedSeason)!;
      const seasonMatches = matches.filter(m => m.season_id === selectedSeason);
      await generateTournamentScorelist(tournament, season, seasonMatches, batting, bowling, players, user?.username || 'admin');
      toast({ title: '✅ Tournament scorebook generated' });
      refresh();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    setGenerating(false);
  };

  const handleVerify = async (sl: DigitalScorelist) => {
    const result = await verifyScorelist(sl);
    setVerifyResult(result);
    setViewScorelist(sl);
  };

  const handleExportJSON = (sl: DigitalScorelist) => {
    const json = exportScorelistAsJSON(sl);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sl.scorelist_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCertify = async (sl: DigitalScorelist, stage: string) => {
    const certs: CertificationApproval[] = sl.certifications_json ? JSON.parse(sl.certifications_json) : [];
    certs.push({
      approver_id: user?.username || 'admin',
      approver_name: user?.name || 'Admin',
      designation: user?.designation || 'Administrator',
      timestamp: new Date().toISOString(),
      token: `CERT_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      stage,
    });
    
    const newStatus = stage === 'official_certified' ? 'official_certified' : stage;
    const locked = stage === 'official_certified';
    
    await v2api.updateScorelist({
      ...sl,
      certification_status: newStatus,
      certifications_json: JSON.stringify(certs),
      locked,
    });
    logAudit(user?.username || 'admin', 'certify_scorelist', 'scorelist', sl.scorelist_id, stage);
    toast({ title: `Certified: ${stage}` });
    refresh();
  };

  const getPayload = (sl: DigitalScorelist) => {
    try { return JSON.parse(sl.payload_json); } catch { return null; }
  };

  const verifyUrl = `${window.location.origin}/verify-scorelist/`;

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <h1 className="font-display text-3xl font-bold">🛡️ Digital Scorelists</h1>

        {/* Generate */}
        <Card>
          <CardHeader><CardTitle className="font-display">Generate Scorelist</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Select value={selectedMatch} onValueChange={setSelectedMatch}>
                <SelectTrigger className="w-64"><SelectValue placeholder="Select Match" /></SelectTrigger>
                <SelectContent>
                  {matches.map(m => <SelectItem key={m.match_id} value={m.match_id}>{m.team_a} vs {m.team_b}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={handleGenerateMatch} disabled={generating || !selectedMatch}>Generate Match</Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Select value={selectedTournament} onValueChange={setSelectedTournament}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Tournament" /></SelectTrigger>
                <SelectContent>
                  {tournaments.map(t => <SelectItem key={t.tournament_id} value={t.tournament_id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Season" /></SelectTrigger>
                <SelectContent>
                  {seasons.filter(s => s.tournament_id === selectedTournament).map(s => <SelectItem key={s.season_id} value={s.season_id}>{s.year}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={handleGenerateTournament} disabled={generating || !selectedTournament || !selectedSeason}>Generate Tournament</Button>
            </div>
          </CardContent>
        </Card>

        {/* Scorelist Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>ID</TableHead><TableHead>Scope</TableHead><TableHead>Certification</TableHead><TableHead>Generated</TableHead><TableHead>By</TableHead><TableHead>Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {scorelists.map(sl => (
                  <TableRow key={sl.scorelist_id}>
                    <TableCell className="font-mono text-xs">{sl.scorelist_id}</TableCell>
                    <TableCell><Badge variant="outline">{sl.scope_type}</Badge></TableCell>
                    <TableCell>
                      <Badge className={sl.certification_status === 'official_certified' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}>
                        {sl.locked ? '🔒' : ''} {sl.certification_status || 'draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{sl.generated_at}</TableCell>
                    <TableCell className="text-sm">{sl.generated_by}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleVerify(sl)} title="View & Verify"><Eye className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleExportJSON(sl)} title="Export JSON"><FileJson className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Scorelist Viewer Dialog */}
        <Dialog open={!!viewScorelist} onOpenChange={o => { if (!o) { setViewScorelist(null); setVerifyResult(null); } }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-thin">
            {viewScorelist && (() => {
              const payload = getPayload(viewScorelist);
              const certs: CertificationApproval[] = viewScorelist.certifications_json ? JSON.parse(viewScorelist.certifications_json) : [];
              const match = payload?.match;
              
              return (
                <div className="relative">
                  {/* Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                    <p className="text-6xl font-display font-bold text-muted/10 rotate-[-30deg] whitespace-nowrap select-none">
                      VERIFIED MATCH RECORD
                    </p>
                  </div>

                  <div className="relative z-10 space-y-6">
                    {/* Header */}
                    <div className="text-center border-b pb-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-widest">Cricket Club Portal</p>
                      <h2 className="font-display text-2xl font-bold">Digital {viewScorelist.scope_type === 'match' ? 'Match' : 'Tournament'} Scorelist</h2>
                      <p className="font-mono text-xs text-muted-foreground mt-1">{viewScorelist.scorelist_id}</p>
                    </div>

                    {/* Verification Badge */}
                    {verifyResult && (
                      <div className={`flex items-center justify-center gap-2 p-3 rounded-lg ${verifyResult.valid ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                        {verifyResult.valid ? <ShieldCheck className="h-5 w-5" /> : <ShieldX className="h-5 w-5" />}
                        <span className="font-semibold">{verifyResult.valid ? '✔ Authentic Scorelist' : `❌ ${verifyResult.reason}`}</span>
                      </div>
                    )}

                    {/* Match Info */}
                    {match && (
                      <Card>
                        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div><span className="text-muted-foreground">Tournament:</span><p className="font-semibold">{payload.tournament?.name}</p></div>
                          <div><span className="text-muted-foreground">Season:</span><p className="font-semibold">{payload.season?.year}</p></div>
                          <div><span className="text-muted-foreground">Date:</span><p className="font-semibold">{match.date}</p></div>
                          <div><span className="text-muted-foreground">Venue:</span><p className="font-semibold">{match.venue || 'N/A'}</p></div>
                          {match.match_stage && <div><span className="text-muted-foreground">Stage:</span><p><Badge className="bg-accent text-accent-foreground">{match.match_stage}</Badge></p></div>}
                        </CardContent>
                      </Card>
                    )}

                    {/* Scoreboard */}
                    {match && (
                      <div className="grid grid-cols-3 gap-4 text-center bg-muted/30 rounded-lg p-4">
                        <div><p className="font-display font-bold">{match.team_a}</p><p className="text-2xl font-bold text-primary">{match.team_a_score || '-'}</p></div>
                        <div className="flex items-center justify-center"><span className="font-display font-bold text-muted-foreground text-xl">VS</span></div>
                        <div><p className="font-display font-bold">{match.team_b}</p><p className="text-2xl font-bold text-primary">{match.team_b_score || '-'}</p></div>
                      </div>
                    )}

                    {/* Batting & Bowling Tables */}
                    {payload?.battingData?.length > 0 && (
                      <div>
                        <h3 className="font-display font-semibold mb-2">🏏 Batting Scorecard</h3>
                        <Table>
                          <TableHeader><TableRow>
                            <TableHead>Batter</TableHead><TableHead>Team</TableHead><TableHead className="text-right">R</TableHead><TableHead className="text-right">B</TableHead><TableHead className="text-right">4s</TableHead><TableHead className="text-right">6s</TableHead><TableHead>Dismissal</TableHead>
                          </TableRow></TableHeader>
                          <TableBody>
                            {payload.battingData.map((b: any, i: number) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium">{players.find(p => p.player_id === b.player_id)?.name || b.player_id}</TableCell>
                                <TableCell className="text-xs">{b.team}</TableCell>
                                <TableCell className="text-right font-bold">{b.runs}</TableCell>
                                <TableCell className="text-right">{b.balls}</TableCell>
                                <TableCell className="text-right">{b.fours}</TableCell>
                                <TableCell className="text-right">{b.sixes}</TableCell>
                                <TableCell className="text-xs">{b.how_out || 'not out'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {payload?.bowlingData?.length > 0 && (
                      <div>
                        <h3 className="font-display font-semibold mb-2">🎯 Bowling Figures</h3>
                        <Table>
                          <TableHeader><TableRow>
                            <TableHead>Bowler</TableHead><TableHead>Team</TableHead><TableHead className="text-right">O</TableHead><TableHead className="text-right">M</TableHead><TableHead className="text-right">R</TableHead><TableHead className="text-right">W</TableHead>
                          </TableRow></TableHeader>
                          <TableBody>
                            {payload.bowlingData.map((b: any, i: number) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium">{players.find(p => p.player_id === b.player_id)?.name || b.player_id}</TableCell>
                                <TableCell className="text-xs">{b.team}</TableCell>
                                <TableCell className="text-right">{b.overs}</TableCell>
                                <TableCell className="text-right">{b.maidens}</TableCell>
                                <TableCell className="text-right">{b.runs_conceded}</TableCell>
                                <TableCell className="text-right font-bold">{b.wickets}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Match Result */}
                    {match?.result && (
                      <Card className="border-primary/30 bg-primary/5">
                        <CardContent className="p-4 text-center">
                          <p className="font-display text-lg font-bold text-primary">{match.result}</p>
                          {match.man_of_match && <p className="text-sm text-muted-foreground">🏅 Man of the Match: {players.find(p => p.player_id === match.man_of_match)?.name}</p>}
                        </CardContent>
                      </Card>
                    )}



                    {viewScorelist.scope_type === 'tournament' && payload?.matches?.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="font-display text-xl font-bold">📘 Full Tournament Scorebook</h3>
                        {payload.matches.map((tm: any) => {
                          const matchBat = (payload.battingData || []).filter((b: any) => b.match_id === tm.match_id);
                          const matchBowl = (payload.bowlingData || []).filter((b: any) => b.match_id === tm.match_id);
                          const teamABat = matchBat.filter((b: any) => b.team === tm.team_a);
                          const teamBBat = matchBat.filter((b: any) => b.team === tm.team_b);
                          const teamABowl = matchBowl.filter((b: any) => b.team === tm.team_a);
                          const teamBBowl = matchBowl.filter((b: any) => b.team === tm.team_b);

                          return (
                            <Card key={tm.match_id} className="border-2 border-primary/20">
                              <CardHeader>
                                <CardTitle className="text-base">{tm.team_a} vs {tm.team_b}</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                                  <p><span className="text-muted-foreground">Date:</span> {tm.date || 'N/A'}</p>
                                  <p><span className="text-muted-foreground">Venue:</span> {tm.venue || 'N/A'}</p>
                                  <p><span className="text-muted-foreground">Stage:</span> {tm.match_stage || 'League'}</p>
                                  <p><span className="text-muted-foreground">Status:</span> {tm.status || '-'}</p>
                                  <p><span className="text-muted-foreground">Result:</span> {tm.result || '-'}</p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                  <div className="space-y-3">
                                    <h4 className="font-semibold">🏏 {tm.team_a} Batting</h4>
                                    {teamABat.length > 0 ? (
                                      <Table>
                                        <TableHeader><TableRow>
                                          <TableHead>Batter</TableHead><TableHead className="text-right">R</TableHead><TableHead className="text-right">B</TableHead><TableHead className="text-right">4s</TableHead><TableHead className="text-right">6s</TableHead><TableHead>Dismissal</TableHead>
                                        </TableRow></TableHeader>
                                        <TableBody>
                                          {teamABat.map((b: any) => (
                                            <TableRow key={b.id}>
                                              <TableCell className="font-medium">{players.find(p => p.player_id === b.player_id)?.name || b.player_id}</TableCell>
                                              <TableCell className="text-right">{b.runs}</TableCell>
                                              <TableCell className="text-right">{b.balls}</TableCell>
                                              <TableCell className="text-right">{b.fours}</TableCell>
                                              <TableCell className="text-right">{b.sixes}</TableCell>
                                              <TableCell className="text-xs">{b.how_out || 'not out'}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    ) : <p className="text-xs text-muted-foreground">No batting data</p>}

                                    <h4 className="font-semibold">🎯 {tm.team_a} Bowling</h4>
                                    {teamABowl.length > 0 ? (
                                      <Table>
                                        <TableHeader><TableRow>
                                          <TableHead>Bowler</TableHead><TableHead className="text-right">O</TableHead><TableHead className="text-right">M</TableHead><TableHead className="text-right">R</TableHead><TableHead className="text-right">W</TableHead>
                                        </TableRow></TableHeader>
                                        <TableBody>
                                          {teamABowl.map((b: any) => (
                                            <TableRow key={b.id}>
                                              <TableCell className="font-medium">{players.find(p => p.player_id === b.player_id)?.name || b.player_id}</TableCell>
                                              <TableCell className="text-right">{b.overs}</TableCell>
                                              <TableCell className="text-right">{b.maidens}</TableCell>
                                              <TableCell className="text-right">{b.runs_conceded}</TableCell>
                                              <TableCell className="text-right">{b.wickets}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    ) : <p className="text-xs text-muted-foreground">No bowling data</p>}
                                  </div>

                                  <div className="space-y-3">
                                    <h4 className="font-semibold">🏏 {tm.team_b} Batting</h4>
                                    {teamBBat.length > 0 ? (
                                      <Table>
                                        <TableHeader><TableRow>
                                          <TableHead>Batter</TableHead><TableHead className="text-right">R</TableHead><TableHead className="text-right">B</TableHead><TableHead className="text-right">4s</TableHead><TableHead className="text-right">6s</TableHead><TableHead>Dismissal</TableHead>
                                        </TableRow></TableHeader>
                                        <TableBody>
                                          {teamBBat.map((b: any) => (
                                            <TableRow key={b.id}>
                                              <TableCell className="font-medium">{players.find(p => p.player_id === b.player_id)?.name || b.player_id}</TableCell>
                                              <TableCell className="text-right">{b.runs}</TableCell>
                                              <TableCell className="text-right">{b.balls}</TableCell>
                                              <TableCell className="text-right">{b.fours}</TableCell>
                                              <TableCell className="text-right">{b.sixes}</TableCell>
                                              <TableCell className="text-xs">{b.how_out || 'not out'}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    ) : <p className="text-xs text-muted-foreground">No batting data</p>}

                                    <h4 className="font-semibold">🎯 {tm.team_b} Bowling</h4>
                                    {teamBBowl.length > 0 ? (
                                      <Table>
                                        <TableHeader><TableRow>
                                          <TableHead>Bowler</TableHead><TableHead className="text-right">O</TableHead><TableHead className="text-right">M</TableHead><TableHead className="text-right">R</TableHead><TableHead className="text-right">W</TableHead>
                                        </TableRow></TableHeader>
                                        <TableBody>
                                          {teamBBowl.map((b: any) => (
                                            <TableRow key={b.id}>
                                              <TableCell className="font-medium">{players.find(p => p.player_id === b.player_id)?.name || b.player_id}</TableCell>
                                              <TableCell className="text-right">{b.overs}</TableCell>
                                              <TableCell className="text-right">{b.maidens}</TableCell>
                                              <TableCell className="text-right">{b.runs_conceded}</TableCell>
                                              <TableCell className="text-right">{b.wickets}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    ) : <p className="text-xs text-muted-foreground">No bowling data</p>}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}

                    {/* Certification Panel */}
                    <Card className="border-2 border-accent/30">
                      <CardHeader><CardTitle className="font-display text-sm">🏛️ Certification Panel</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        {certs.length > 0 ? (
                          <div className="space-y-2">
                            {certs.map((c, i) => (
                              <div key={i} className="flex items-center gap-3 p-2 rounded bg-primary/5 border border-primary/20">
                                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                                <div className="flex-1">
                                  <p className="text-sm font-semibold">{c.approver_name} – {c.designation}</p>
                                  <p className="text-xs text-muted-foreground">{c.stage} • {c.timestamp}</p>
                                </div>
                                <Badge variant="outline" className="text-xs font-mono">{c.token.substring(0, 12)}</Badge>
                              </div>
                            ))}
                          </div>
                        ) : <p className="text-sm text-muted-foreground">No certifications yet</p>}

                        {!viewScorelist.locked && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t">
                            {CERTIFICATION_STAGES.filter(s => s !== 'draft').map(stage => (
                              <Button key={stage} size="sm" variant="outline" onClick={() => handleCertify(viewScorelist, stage)} className="text-xs capitalize">
                                {stage.replace(/_/g, ' ')}
                              </Button>
                            ))}
                          </div>
                        )}

                        {viewScorelist.locked && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-primary font-semibold text-sm">
                            <Lock className="h-4 w-4" />
                            ✔ OFFICIALLY CERTIFIED MATCH RESULT
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* QR Code */}
                    <div className="flex items-center justify-center gap-6 py-4">
                      <QRCodeSVG value={`${verifyUrl}${viewScorelist.scorelist_id}`} size={120} />
                      <div className="text-sm">
                        <p className="font-semibold">Scan to Verify</p>
                        <p className="text-xs text-muted-foreground font-mono break-all">{verifyUrl}{viewScorelist.scorelist_id}</p>
                      </div>
                    </div>

                    {/* Security Footer */}
                    <div className="border-t pt-4 text-center space-y-1">
                      <p className="text-xs text-muted-foreground font-mono">Document ID: {viewScorelist.scorelist_id}</p>
                      <p className="text-xs text-muted-foreground font-mono">Integrity Hash: {viewScorelist.hash_digest.substring(0, 32)}...</p>
                      <p className="text-[10px] text-muted-foreground/60 italic mt-2">
                        Official League Record • Tampering Invalidates Document • This document is digitally certified. Any alteration invalidates authenticity.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminScorelistsPage;

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
import { DigitalScorelist, CertificationApproval, ManagementUser } from '@/lib/v2types';
import { verifyScorelist, exportScorelistAsJSON, generateMatchScorelist, generateTournamentScorelist } from '@/lib/scorelist';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileJson, ShieldCheck, ShieldX, Lock, Eye, Download, CheckCircle2, FileText } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const stageLabels: Record<string, string> = {
  draft: 'Draft',
  scoring_completed: 'Scoring Completed',
  referee_verified: 'Referee Verified',
  director_approved: 'Director Approved',
  official_certified: 'Official Certified',
};

const stageOrder = ['draft', 'scoring_completed', 'referee_verified', 'director_approved', 'official_certified'];

const designationToStage: Record<string, string> = {
  'Scoring Official': 'scoring_completed',
  'Match Referee': 'referee_verified',
  'Tournament Director': 'director_approved',
  President: 'official_certified',
  'Vice President': 'official_certified',
};

const AdminScorelistsPage = () => {
  const { isAdmin, isManagement, user } = useAuth();
  const { matches, batting, bowling, players, tournaments, seasons } = useData();
  const { toast } = useToast();

  const [scorelists, setScorelists] = useState<DigitalScorelist[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [managementUsers, setManagementUsers] = useState<ManagementUser[]>([]);
  const [selectedMatch, setSelectedMatch] = useState('');
  const [selectedTournament, setSelectedTournament] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [viewScorelist, setViewScorelist] = useState<DigitalScorelist | null>(null);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; reason?: string } | null>(null);

  const refresh = async () => {
    const [data, mgmt] = await Promise.all([v2api.getScorelists(), v2api.getManagementUsers()]);
    setScorelists(data);
    setManagementUsers(mgmt.filter((m) => String(m.status || '').toLowerCase() === 'active' || !m.status));
    setLoading(false);
  };

  useEffect(() => {
    const boot = async () => {
      await v2api.syncHeaders().catch(() => false);
      await refresh();
    };
    boot();
    const id = window.setInterval(refresh, 10000);
    return () => window.clearInterval(id);
  }, []);

  if (!isAdmin && !isManagement) return <Navigate to="/login" />;

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
      const seasonMatches = matches.filter(m => m.season_id === selectedSeason && m.tournament_id === selectedTournament);
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
    a.href = url; a.download = `${sl.scorelist_id}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const normalizeDesignation = (designation?: string) => String(designation || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const safeParsePayload = (sl: DigitalScorelist) => { try { return JSON.parse(sl.payload_json || '{}'); } catch { return null; } };
  const readCertifications = (sl: DigitalScorelist): CertificationApproval[] => {
    if (sl.certifications_json) {
      try {
        const parsed = JSON.parse(sl.certifications_json);
        if (Array.isArray(parsed)) return parsed as CertificationApproval[];
      } catch {
        /* ignore */
      }
    }
    const payload = safeParsePayload(sl);
    const fromPayload = payload?.__certification?.approvals;
    return Array.isArray(fromPayload) ? fromPayload : [];
  };
  const readStatus = (sl: DigitalScorelist, certs: CertificationApproval[]): string => {
    if (sl.certification_status) return sl.certification_status;
    const latest = certs.reduce((best, c) => {
      return stageOrder.indexOf(c.stage) > stageOrder.indexOf(best) ? c.stage : best;
    }, 'draft');
    return latest || 'draft';
  };
  const readLocked = (sl: DigitalScorelist): boolean => {
    if (typeof sl.locked === 'boolean') return sl.locked;
    const payload = safeParsePayload(sl);
    return !!payload?.__certification?.locked;
  };

  const resolveStageFromDesignation = (designation?: string): string | null => {
    const d = normalizeDesignation(designation);
    if (!d) return null;
    if (d.includes('scoring')) return 'scoring_completed';
    if (d.includes('referee')) return 'referee_verified';
    if (d.includes('director')) return 'director_approved';
    if (d.includes('president')) return 'official_certified';
    const mapped = Object.entries(designationToStage).find(([k]) => normalizeDesignation(k) === d)?.[1];
    return mapped || null;
  };

  const requiredApproversByStage = stageOrder.reduce<Record<string, ManagementUser[]>>((acc, stage) => {
    acc[stage] = managementUsers.filter((m) => resolveStageFromDesignation(m.designation) === stage);
    return acc;
  }, {} as Record<string, ManagementUser[]>);

  const handleExportPDF = (sl: DigitalScorelist) => {
    const payload = getPayload(sl);
    const match = payload?.match;
    const certs = readCertifications(sl);
    const season = payload?.season;
    const tournament = payload?.tournament;
    const payloadMatches = (payload?.matches || []) as any[];

    const pendingApprovals = stageOrder.flatMap((stage) => {
      const requiredForStage = requiredApproversByStage[stage] || [];
      const signedIds = new Set(certs.filter((c) => c.stage === stage).map((c) => c.approver_id));
      return requiredForStage
        .filter((r) => !signedIds.has(r.management_id))
        .map((r) => ({ stage, name: r.name, designation: r.designation }));
    });

    // Build HTML content for print-to-PDF
    const batRows = (payload?.battingData || []).map((b: any) => 
      `<tr><td>${players.find(p => p.player_id === b.player_id)?.name || b.player_id}</td><td>${b.team}</td><td style="text-align:right;font-weight:bold">${b.runs}</td><td style="text-align:right">${b.balls}</td><td style="text-align:right">${b.fours}</td><td style="text-align:right">${b.sixes}</td><td>${b.how_out || 'not out'}</td></tr>`
    ).join('');
    const bowlRows = (payload?.bowlingData || []).map((b: any) =>
      `<tr><td>${players.find(p => p.player_id === b.player_id)?.name || b.player_id}</td><td>${b.team}</td><td style="text-align:right">${b.overs}</td><td style="text-align:right">${b.maidens}</td><td style="text-align:right">${b.runs_conceded}</td><td style="text-align:right;font-weight:bold">${b.wickets}</td></tr>`
    ).join('');
    const certRows = certs.map(c => `<tr><td>${c.approver_name}</td><td>${c.designation}</td><td>${stageLabels[c.stage] || c.stage.replace(/_/g, ' ')}</td><td>${new Date(c.timestamp).toLocaleString()}</td><td style="font-family:monospace;font-size:10px">${c.token.substring(0,12)}</td></tr>`).join('');
    const pendingRows = pendingApprovals.map((p) => `<tr><td>${p.name}</td><td>${p.designation}</td><td>${stageLabels[p.stage] || p.stage}</td><td>Pending</td></tr>`).join('');
    
    const aScore = match?.team_a_score || '-';
    const bScore = match?.team_b_score || '-';

    const calcScore = (team: string, matchId: string) => {
      const rows = (payload?.battingData || []).filter((b: any) => b.match_id === matchId && b.team === team);
      const runs = rows.reduce((s: number, b: any) => s + (Number(b.runs) || 0), 0);
      const wkts = rows.filter((b: any) => {
        const out = String(b.how_out || '').trim().toLowerCase();
        return out && out !== 'not out';
      }).length;
      const balls = rows.reduce((s: number, b: any) => s + (Number(b.balls) || 0), 0);
      const overs = `${Math.floor(balls / 6)}.${balls % 6}`;
      return { runs, wkts, overs };
    };

    const tournamentMatchBlocks = payloadMatches.map((m: any, idx: number) => {
      const matchBat = (payload?.battingData || []).filter((b: any) => b.match_id === m.match_id);
      const matchBowl = (payload?.bowlingData || []).filter((b: any) => b.match_id === m.match_id);
      const scoreA = m.team_a_score || `${calcScore(m.team_a, m.match_id).runs}/${calcScore(m.team_a, m.match_id).wkts} (${calcScore(m.team_a, m.match_id).overs} ov)`;
      const scoreB = m.team_b_score || `${calcScore(m.team_b, m.match_id).runs}/${calcScore(m.team_b, m.match_id).wkts} (${calcScore(m.team_b, m.match_id).overs} ov)`;
      const matchBatRows = matchBat.map((b: any) => `<tr><td>${players.find(p => p.player_id === b.player_id)?.name || b.player_id}</td><td>${b.team}</td><td style="text-align:right;font-weight:bold">${b.runs}</td><td style="text-align:right">${b.balls}</td><td style="text-align:right">${b.fours}</td><td style="text-align:right">${b.sixes}</td><td>${b.how_out || 'not out'}</td></tr>`).join('');
      const matchBowlRows = matchBowl.map((b: any) => `<tr><td>${players.find(p => p.player_id === b.player_id)?.name || b.player_id}</td><td>${b.team}</td><td style="text-align:right">${b.overs}</td><td style="text-align:right">${b.maidens}</td><td style="text-align:right">${b.runs_conceded}</td><td style="text-align:right;font-weight:bold">${b.wickets}</td></tr>`).join('');
      return `
      <div class="match-book-page" style="margin-top:22px;padding-top:12px;border-top:1px solid #ddd;page-break-inside:avoid">
        <h2>Match ${idx + 1}: ${m.team_a} vs ${m.team_b}</h2>
        <p><strong>Date:</strong> ${m.date || '-'} | <strong>Venue:</strong> ${m.venue || '-'} | <strong>Stage:</strong> ${m.match_stage || '-'} | <strong>Status:</strong> ${m.status || '-'}</p>
        <p><strong>Score:</strong> ${m.team_a} ${scoreA} vs ${m.team_b} ${scoreB}</p>
        <p><strong>Result:</strong> ${m.result || '-'} ${m.man_of_match ? `| <strong>Man of the Match:</strong> ${players.find(p => p.player_id === m.man_of_match)?.name || m.man_of_match}` : ''}</p>
        <h3>Batting</h3>
        <table><tr><th>Batter</th><th>Team</th><th style="text-align:right">R</th><th style="text-align:right">B</th><th style="text-align:right">4s</th><th style="text-align:right">6s</th><th>Dismissal</th></tr>${matchBatRows || '<tr><td colspan="7" style="text-align:center;color:#777">No batting entries</td></tr>'}</table>
        <h3>Bowling</h3>
        <table><tr><th>Bowler</th><th>Team</th><th style="text-align:right">O</th><th style="text-align:right">M</th><th style="text-align:right">R</th><th style="text-align:right">W</th></tr>${matchBowlRows || '<tr><td colspan="6" style="text-align:center;color:#777">No bowling entries</td></tr>'}</table>
      </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><title>Scorelist ${sl.scorelist_id}</title>
<style>body{font-family:Arial,sans-serif;margin:40px;color:#1a1a1a}h1{text-align:center;color:#1e6b3a}h2{color:#1e6b3a;border-bottom:2px solid #1e6b3a;padding-bottom:4px}
table{width:100%;border-collapse:collapse;margin:10px 0}th,td{border:1px solid #ddd;padding:6px 8px;font-size:12px}th{background:#f0f7f0;text-align:left}
.scoreboard{display:flex;justify-content:space-around;text-align:center;background:#f0f7f0;padding:20px;border-radius:8px;margin:20px 0}
.team-score{font-size:28px;font-weight:bold;color:#1e6b3a}.watermark{position:fixed;top:40%;left:10%;transform:rotate(-30deg);font-size:80px;color:rgba(30,107,58,0.04);white-space:nowrap;pointer-events:none;z-index:-1}
.footer{text-align:center;font-size:9px;color:#999;margin-top:30px;border-top:1px solid #ddd;padding-top:10px}
.certified{background:#e8f5e9;border:2px solid #1e6b3a;text-align:center;padding:12px;border-radius:8px;font-weight:bold;color:#1e6b3a;margin:20px 0}
.match-book-page{page-break-before:always}
@media print{.watermark{display:block}}</style></head><body>
<div class="watermark">VERIFIED MATCH RECORD</div>
<p style="text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:3px;color:#666">Cricket Club Portal</p>
<h1>Digital ${sl.scope_type === 'match' ? 'Match' : 'Tournament'} Scorelist</h1>
<p style="text-align:center;font-family:monospace;font-size:11px;color:#999">${sl.scorelist_id}</p>
<p style="text-align:center;margin:6px 0"><strong>Tournament:</strong> ${tournament?.name || '-'} | <strong>Format:</strong> ${tournament?.format || '-'} | <strong>Overs:</strong> ${tournament?.overs || '-'}</p>
<p style="text-align:center;margin:6px 0"><strong>Season:</strong> ${season?.year || '-'} | <strong>Dates:</strong> ${season?.start_date || '-'} to ${season?.end_date || '-'}</p>
${match ? `<div class="scoreboard"><div><h3>${match.team_a}</h3><div class="team-score">${aScore}</div></div><div style="display:flex;align-items:center"><span style="font-size:24px;color:#999">VS</span></div><div><h3>${match.team_b}</h3><div class="team-score">${bScore}</div></div></div>` : ''}
${match?.result ? `<p style="text-align:center;font-size:16px;font-weight:bold;color:#1e6b3a">${match.result}</p>` : ''}
${match?.man_of_match ? `<p style="text-align:center">🏅 Man of the Match: ${players.find(p => p.player_id === match.man_of_match)?.name || ''}</p>` : ''}
${payloadMatches.length > 0 ? `<p style="text-align:center;font-weight:bold;background:#f9fcf9;padding:10px;border:1px solid #dbe7db;border-radius:6px">Tournament Scorebook: ${payloadMatches.length} matches included with complete match-wise scorecards.</p>` : ''}
<h2>🏏 Batting Scorecard</h2><table><tr><th>Batter</th><th>Team</th><th style="text-align:right">R</th><th style="text-align:right">B</th><th style="text-align:right">4s</th><th style="text-align:right">6s</th><th>Dismissal</th></tr>${batRows}</table>
<h2>🎯 Bowling Figures</h2><table><tr><th>Bowler</th><th>Team</th><th style="text-align:right">O</th><th style="text-align:right">M</th><th style="text-align:right">R</th><th style="text-align:right">W</th></tr>${bowlRows}</table>
${tournamentMatchBlocks}
${certs.length > 0 ? `<h2>🏛️ Certification Timeline</h2><table><tr><th>Name</th><th>Designation</th><th>Stage</th><th>Timestamp</th><th>Token</th></tr>${certRows}</table>` : ''}
<h2>🧾 Pending Approvals</h2><table><tr><th>Name</th><th>Designation</th><th>Required Stage</th><th>Status</th></tr>${pendingRows || '<tr><td colspan="4" style="text-align:center;color:#1e6b3a;font-weight:bold">All required approvals completed</td></tr>'}</table>
${sl.locked ? '<div class="certified">✔ OFFICIALLY CERTIFIED MATCH RESULT</div>' : ''}
<div class="footer"><p>Document ID: ${sl.scorelist_id} | Hash: ${sl.hash_digest.substring(0,32)}...</p><p>Official League Record • Tampering Invalidates Document • This document is digitally certified. Any alteration invalidates authenticity.</p></div>
</body></html>`;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
      setTimeout(() => printWin.print(), 500);
    }
  };

  const handleCertify = async (sl: DigitalScorelist, stage: string) => {
    const certs = readCertifications(sl);
    
    // Check if user already signed this stage
    const userId = user?.management_id || user?.username || 'admin';
    if (certs.some(c => c.approver_id === userId && c.stage === stage)) {
      toast({ title: 'Already signed this stage' });
      return;
    }

    certs.push({
      approver_id: userId,
      approver_name: user?.name || 'Admin',
      designation: user?.designation || 'Administrator',
      timestamp: new Date().toISOString(),
      token: `CERT_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      stage,
    });
    const locked = stage === 'official_certified';
    const payload = safeParsePayload(sl) || {};
    payload.__certification = {
      status: stage,
      locked,
      approvals: certs,
      lastUpdatedAt: new Date().toISOString(),
    };
    await v2api.updateScorelist({
      ...sl,
      payload_json: JSON.stringify(payload),
      certification_status: stage,
      certifications_json: JSON.stringify(certs),
      locked,
    });
    logAudit(userId, 'certify_scorelist', 'scorelist', sl.scorelist_id, stage);
    toast({ title: `✅ Certified: ${stageLabels[stage] || stage}` });
    refresh();
  };

  const getPayload = (sl: DigitalScorelist) => { try { return JSON.parse(sl.payload_json); } catch { return null; } };
  const verifyUrl = `${window.location.origin}/verify-scorelist/`;

  // Determine which certification stage this management user can approve
  const userStage = isManagement && user?.designation ? resolveStageFromDesignation(user.designation) : null;

  const getNextStage = (sl: DigitalScorelist): string | null => {
    const current = sl.certification_status || 'draft';
    const idx = stageOrder.indexOf(current);
    if (idx < stageOrder.length - 1) return stageOrder[idx + 1];
    return null;
  };

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold">🛡️ Digital Scorelists</h1>

        {/* Generate - Admin Only */}
        {isAdmin && (
          <Card>
            <CardHeader><CardTitle className="font-display text-sm md:text-base">Generate Scorelist</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <Select value={selectedMatch} onValueChange={setSelectedMatch}>
                  <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Select Match" /></SelectTrigger>
                  <SelectContent>
                    {matches.map(m => <SelectItem key={m.match_id} value={m.match_id}>{m.team_a} vs {m.team_b}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={handleGenerateMatch} disabled={generating || !selectedMatch} className="w-full sm:w-auto">
                  {generating && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Generate Match
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <Select value={selectedTournament} onValueChange={setSelectedTournament}>
                  <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Tournament" /></SelectTrigger>
                  <SelectContent>
                    {tournaments.map(t => <SelectItem key={t.tournament_id} value={t.tournament_id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                  <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Season" /></SelectTrigger>
                  <SelectContent>
                    {seasons.filter(s => s.tournament_id === selectedTournament).map(s => <SelectItem key={s.season_id} value={s.season_id}>{s.year}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={handleGenerateTournament} disabled={generating || !selectedTournament || !selectedSeason} className="w-full sm:w-auto">
                  Generate Tournament
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scorelist Cards */}
        <div className="space-y-3">
          {scorelists.map(sl => {
            const certs = readCertifications(sl);
            const payload = getPayload(sl);
            const match = payload?.match;
            const aScore = match?.team_a_score || '-';
            const bScore = match?.team_b_score || '-';
            const effectiveStatus = readStatus(sl, certs);
            const effectiveLocked = readLocked(sl);
            const nextStage = getNextStage({ ...sl, certification_status: effectiveStatus });
            const canSign = !effectiveLocked && isManagement && userStage && nextStage === userStage;
            const userId = user?.management_id || user?.username || 'admin';
            const alreadySignedThisStage = certs.some(c => c.approver_id === userId && c.stage === userStage);

            return (
              <Card key={sl.scorelist_id} className={`${effectiveLocked ? 'border-primary/40 bg-primary/5' : ''}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">{sl.scorelist_id}</p>
                      {match && (
                        <p className="font-display font-bold text-sm md:text-base mt-1">
                          {match.team_a} {aScore} vs {match.team_b} {bScore}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{sl.scope_type}</Badge>
                      <Badge className={effectiveLocked ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}>
                        {effectiveLocked ? '🔒 ' : ''}{stageLabels[effectiveStatus] || effectiveStatus}
                      </Badge>
                    </div>
                  </div>

                  {/* Mini certification timeline */}
                  <div className="flex flex-wrap gap-1">
                    {stageOrder.map(stage => {
                      const cert = certs.find(c => c.stage === stage);
                      return (
                        <Badge key={stage} variant={cert ? 'default' : 'outline'} className={`text-[10px] ${cert ? 'bg-primary/80 text-primary-foreground' : 'opacity-40'}`}>
                          {cert ? '✓' : '○'} {stageLabels[stage]?.split(' ')[0]}
                        </Badge>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleVerify(sl)} className="gap-1 text-xs">
                      <Eye className="h-3 w-3" /> View & Verify
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleExportJSON(sl)} className="gap-1 text-xs">
                      <FileJson className="h-3 w-3" /> JSON
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleExportPDF(sl)} className="gap-1 text-xs">
                      <FileText className="h-3 w-3" /> PDF
                    </Button>
                    {canSign && !alreadySignedThisStage && (
                      <Button size="sm" onClick={() => handleCertify(sl, userStage!)} className="gap-1 text-xs">
                        <ShieldCheck className="h-3 w-3" /> Sign as {user?.designation}
                      </Button>
                    )}
                    {isAdmin && !effectiveLocked && nextStage && (
                      <Button size="sm" variant="secondary" onClick={() => handleCertify(sl, nextStage)} className="gap-1 text-xs">
                        Advance to {stageLabels[nextStage]}
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">Generated {sl.generated_at} by {sl.generated_by}</p>
                </CardContent>
              </Card>
            );
          })}
          {scorelists.length === 0 && <p className="text-muted-foreground text-center py-8">No scorelists generated yet.</p>}
        </div>

        {/* Viewer Dialog */}
        <Dialog open={!!viewScorelist} onOpenChange={o => { if (!o) { setViewScorelist(null); setVerifyResult(null); } }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-thin p-4 md:p-6">
            {viewScorelist && (() => {
              const payload = getPayload(viewScorelist);
              const certs = readCertifications(viewScorelist);
              const effectiveLocked = readLocked(viewScorelist);
              const match = payload?.match;
              const calcScore = (team: string) => {
                const rows = (payload?.battingData || []).filter((b: any) => b.team === team);
                const runs = rows.reduce((s: number, b: any) => s + (b.runs || 0), 0);
                const wkts = rows.filter((b: any) => b.how_out && b.how_out !== 'not out' && b.how_out !== '').length;
                const balls = rows.reduce((s: number, b: any) => s + (b.balls || 0), 0);
                const overs = Math.floor(balls / 6) + (balls % 6) / 10;
                return { runs, wkts, overs: overs.toFixed(1) };
              };

              return (
                <div className="relative">
                  {/* Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                    <p className="text-4xl md:text-6xl font-display font-bold text-muted/10 rotate-[-30deg] whitespace-nowrap select-none">
                      VERIFIED MATCH RECORD
                    </p>
                  </div>

                  <div className="relative z-10 space-y-4 md:space-y-6">
                    {/* Header */}
                    <div className="text-center border-b pb-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-widest">Cricket Club Portal</p>
                      <h2 className="font-display text-xl md:text-2xl font-bold">Digital {viewScorelist.scope_type === 'match' ? 'Match' : 'Tournament'} Scorelist</h2>
                      <p className="font-mono text-xs text-muted-foreground mt-1">{viewScorelist.scorelist_id}</p>
                    </div>

                    {/* Verification Badge */}
                    {verifyResult && (
                      <div className={`flex items-center justify-center gap-2 p-3 rounded-lg ${verifyResult.valid ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                        {verifyResult.valid ? <ShieldCheck className="h-5 w-5" /> : <ShieldX className="h-5 w-5" />}
                        <span className="font-semibold text-sm">{verifyResult.valid ? '✔ Authentic Scorelist' : `❌ ${verifyResult.reason}`}</span>
                      </div>
                    )}

                    {/* Match Scoreboard */}
                    {match && (
                      <div className="grid grid-cols-3 gap-2 md:gap-4 text-center bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-xl p-4 md:p-6 border">
                        <div>
                          <p className="font-display font-bold text-sm md:text-lg">{match.team_a}</p>
                          <p className="text-xl md:text-3xl font-bold text-primary">
                            {match.team_a_score || `${calcScore(match.team_a).runs}/${calcScore(match.team_a).wkts}`}
                          </p>
                          <p className="text-xs text-muted-foreground">({match.team_a_score ? '' : `${calcScore(match.team_a).overs} ov`})</p>
                        </div>
                        <div className="flex items-center justify-center"><span className="font-display font-bold text-muted-foreground text-lg md:text-xl">VS</span></div>
                        <div>
                          <p className="font-display font-bold text-sm md:text-lg">{match.team_b}</p>
                          <p className="text-xl md:text-3xl font-bold text-primary">
                            {match.team_b_score || `${calcScore(match.team_b).runs}/${calcScore(match.team_b).wkts}`}
                          </p>
                          <p className="text-xs text-muted-foreground">({match.team_b_score ? '' : `${calcScore(match.team_b).overs} ov`})</p>
                        </div>
                      </div>
                    )}

                    {/* Batting */}
                    {payload?.battingData?.length > 0 && (
                      <div>
                        <h3 className="font-display font-semibold mb-2">🏏 Batting Scorecard</h3>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader><TableRow>
                              <TableHead>Batter</TableHead><TableHead>Team</TableHead><TableHead className="text-right">R</TableHead><TableHead className="text-right">B</TableHead>
                              <TableHead className="text-right hidden sm:table-cell">4s</TableHead><TableHead className="text-right hidden sm:table-cell">6s</TableHead><TableHead className="hidden sm:table-cell">Dismissal</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                              {payload.battingData.map((b: any, i: number) => (
                                <TableRow key={i}>
                                  <TableCell className="font-medium text-xs md:text-sm">{players.find(p => p.player_id === b.player_id)?.name || b.player_id}</TableCell>
                                  <TableCell className="text-xs">{b.team}</TableCell>
                                  <TableCell className="text-right font-bold">{b.runs}</TableCell>
                                  <TableCell className="text-right">{b.balls}</TableCell>
                                  <TableCell className="text-right hidden sm:table-cell">{b.fours}</TableCell>
                                  <TableCell className="text-right hidden sm:table-cell">{b.sixes}</TableCell>
                                  <TableCell className="text-xs hidden sm:table-cell">{b.how_out || 'not out'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {/* Bowling */}
                    {payload?.bowlingData?.length > 0 && (
                      <div>
                        <h3 className="font-display font-semibold mb-2">🎯 Bowling Figures</h3>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader><TableRow>
                              <TableHead>Bowler</TableHead><TableHead>Team</TableHead><TableHead className="text-right">O</TableHead><TableHead className="text-right">M</TableHead>
                              <TableHead className="text-right">R</TableHead><TableHead className="text-right">W</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                              {payload.bowlingData.map((b: any, i: number) => (
                                <TableRow key={i}>
                                  <TableCell className="font-medium text-xs md:text-sm">{players.find(p => p.player_id === b.player_id)?.name || b.player_id}</TableCell>
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
                      </div>
                    )}

                    {/* Result */}
                    {match?.result && (
                      <Card className="border-primary/30 bg-primary/5">
                        <CardContent className="p-4 text-center">
                          <p className="font-display text-base md:text-lg font-bold text-primary">{match.result}</p>
                          {match.man_of_match && <p className="text-sm text-muted-foreground">🏅 MOM: {players.find(p => p.player_id === match.man_of_match)?.name}</p>}
                        </CardContent>
                      </Card>
                    )}

                    {/* Certification Timeline */}
                    <Card className="border-2 border-accent/30">
                      <CardHeader><CardTitle className="font-display text-sm">🏛️ Certification Timeline</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        {stageOrder.map(stage => {
                          const cert = certs.find(c => c.stage === stage);
                          return (
                            <div key={stage} className={`flex items-center gap-3 p-2 rounded text-sm ${cert ? 'bg-primary/5 border border-primary/20' : 'opacity-40'}`}>
                              {cert ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium capitalize text-xs md:text-sm">{stageLabels[stage]}</p>
                                {cert && <p className="text-xs text-muted-foreground truncate">{cert.approver_name} – {cert.designation} • {new Date(cert.timestamp).toLocaleString()}</p>}
                              </div>
                              {cert && <Badge variant="outline" className="text-[10px] font-mono shrink-0">{cert.token.substring(0, 10)}</Badge>}
                            </div>
                          );
                        })}

                        {effectiveLocked && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-primary font-semibold text-sm">
                            <Lock className="h-4 w-4" /> ✔ OFFICIALLY CERTIFIED MATCH RESULT
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* QR + Security */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 py-4">
                      <QRCodeSVG value={`${verifyUrl}${viewScorelist.scorelist_id}`} size={100} />
                      <div className="text-sm text-center sm:text-left">
                        <p className="font-semibold">Scan to Verify</p>
                        <p className="text-xs text-muted-foreground font-mono break-all max-w-[250px]">{verifyUrl}{viewScorelist.scorelist_id}</p>
                      </div>
                    </div>

                    {/* Export from dialog */}
                    <div className="flex flex-wrap gap-2 justify-center border-t pt-4">
                      <Button size="sm" variant="outline" onClick={() => handleExportPDF(viewScorelist)} className="gap-1">
                        <Download className="h-3 w-3" /> Download PDF
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleExportJSON(viewScorelist)} className="gap-1">
                        <FileJson className="h-3 w-3" /> Download JSON
                      </Button>
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

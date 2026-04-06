import { useState, useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server.browser';
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
import { getScorelistDetailedStatus, getScorelistRoadmap, readScorelistCertifications, resolveStageFromDesignation, scorelistStageLabels, scorelistStageOrder } from '@/lib/workflowStatus';
import { verifyScorelist, exportScorelistAsJSON, generateMatchScorelist, generateTournamentScorelist } from '@/lib/scorelist';
import { buildSecurePatternLayer } from '@/lib/scorelistSecurePattern';
import { sendScorelistApprovalRequestBulk, getAdminNotificationRecipient, explainMailFailure } from '@/lib/mailer';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, ShieldX, Lock, Eye, Download, CheckCircle, FileText } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { formatInIST } from '@/lib/time';
import { getPublicVerifyScorelistUrl } from '@/lib/publicUrl';
import { normalizeId, resolvePlayerFromIdentity } from '@/lib/dataUtils';


const registrationBandRows = 16;

function buildRegistrationBandMarkup(scorelistId: string) {
  const registrationText = scorelistId.toUpperCase();
  const rows = Array.from({ length: registrationBandRows }, (_, index) => {
    const rotation = index % 2 === 0 ? '-90deg' : '90deg';
    return `<div class="registration-row" style="--row-index:${index};--row-rotation:${rotation}">
      <span class="registration-half registration-half-front">${registrationText}</span>
      <span class="registration-window">${registrationText}</span>
      <span class="registration-half registration-half-back">${registrationText}</span>
    </div>`;
  }).join('');

  return `<div class="registration-band">
    <div class="registration-band-label">Registered denomination • Scorelist ID</div>
    <div class="registration-band-rows">${rows}</div>
  </div>`;
}
const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const asDisplayText = (value: unknown, fallback = 'N/A') => {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
};

const truncateDisplay = (value: unknown, length: number, fallback = 'N/A') => {
  const normalized = asDisplayText(value, fallback);
  return normalized.length > length ? normalized.substring(0, length) : normalized;
};

const stageLabels: Record<string, string> = scorelistStageLabels;
const stageOrder: readonly (typeof scorelistStageOrder)[number][] = scorelistStageOrder;

const AdminScorelistsPage = () => {
  const { isAdmin, isManagement, user } = useAuth();
  const { matches, batting, bowling, players, tournaments, seasons } = useData();
  const { toast } = useToast();

  const [scorelists, setScorelists] = useState<DigitalScorelist[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [managementUsers, setManagementUsers] = useState<ManagementUser[]>([]);
  const [selectedMatch, setSelectedMatch] = useState('');
  const [selectedTournament, setSelectedTournament] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [viewScorelist, setViewScorelist] = useState<DigitalScorelist | null>(null);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; reason?: string } | null>(null);
  const getMomDisplayLabel = (identity: unknown) => {
    const resolved = resolvePlayerFromIdentity(identity, players);
    return resolved?.name || normalizeId(identity);
  };

  const refresh = async () => {
    try {
      const [data, mgmt] = await Promise.all([v2api.getScorelists(), v2api.getManagementUsers()]);
      const sortedScorelists = [...data].sort((a, b) => new Date(b.generated_at || 0).getTime() - new Date(a.generated_at || 0).getTime());
      setScorelists(sortedScorelists);
      setManagementUsers(mgmt.filter((m) => String(m.status || '').toLowerCase() === 'active' || !m.status));
      setLoadError(null);
    } catch (error) {
      console.error('Failed to load scorelists dashboard data:', error);
      setLoadError('Scorelists could not be loaded right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const boot = async () => {
      await v2api.syncHeaders().catch(() => false);
      await refresh();
    };
    boot();
    const id = window.setInterval(refresh, 30000);
    return () => window.clearInterval(id);
  }, []);

  if (!isAdmin && !isManagement) return <Navigate to="/login" />;

  const handleGenerateMatch = async () => {
    if (!selectedMatch) {
      toast({ title: 'Select a match first', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const match = matches.find(m => m.match_id === selectedMatch);
      if (!match) {
        toast({ title: 'Selected match could not be found', variant: 'destructive' });
        return;
      }
      const tournament = tournaments.find(t => t.tournament_id === match.tournament_id);
      const season = seasons.find(s => s.season_id === match.season_id);
      const scorelist = await generateMatchScorelist(match, batting, bowling, players, tournament, season, user?.username || 'admin');
      await notifyStageApprovers(scorelist.scorelist_id, 'scoring_completed');
      toast({ title: '✅ Match scorelist generated' });
      await refresh();
    } catch (error) {
      console.error('Match scorelist generation failed:', error);
      toast({ title: 'Could not generate match scorelist', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };


  const formatMatchOptionLabel = (matchId: string) => {
    const match = matches.find((item) => item.match_id === matchId);
    if (!match) return matchId;
    const tournament = tournaments.find((item) => item.tournament_id === match.tournament_id);
    const season = seasons.find((item) => item.season_id === match.season_id);
    const parts = [
      `${match.team_a} vs ${match.team_b}`,
      tournament?.name,
      season ? `Season ${season.year}` : undefined,
      match.match_stage || undefined,
      `Match ID: ${match.match_id}`,
    ].filter(Boolean);
    return parts.join(' • ');
  };

  const handleGenerateTournament = async () => {
    if (!selectedTournament || !selectedSeason) {
      toast({ title: 'Select both tournament and season first', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const tournament = tournaments.find(t => t.tournament_id === selectedTournament);
      const season = seasons.find(s => s.season_id === selectedSeason);
      if (!tournament || !season) {
        toast({ title: 'Tournament or season no longer exists', variant: 'destructive' });
        return;
      }
      const seasonMatches = matches.filter(m => m.season_id === selectedSeason && m.tournament_id === selectedTournament);
      const scorelist = await generateTournamentScorelist(tournament, season, seasonMatches, batting, bowling, players, user?.username || 'admin');
      await notifyStageApprovers(scorelist.scorelist_id, 'scoring_completed');
      toast({ title: '✅ Tournament scorebook generated' });
      await refresh();
    } catch (error) {
      console.error('Tournament scorelist generation failed:', error);
      toast({ title: 'Could not generate tournament scorebook', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
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

  const handleDeleteScorelist = async (sl: DigitalScorelist) => {
    if (!isAdmin) return;
    const confirmed = window.confirm(`Delete scorelist ${sl.scorelist_id}? This cannot be undone.`);
    if (!confirmed) return;
    const ok = await v2api.deleteCustomSheetRow('DIGITAL_SCORELISTS', sl);
    if (!ok) {
      toast({ title: 'Could not delete scorelist', variant: 'destructive' });
      return;
    }
    logAudit(user?.username || 'admin', 'scorelist_delete', 'scorelist', sl.scorelist_id, JSON.stringify({ match_id: sl.match_id, tournament_id: sl.tournament_id, season_id: sl.season_id }));
    toast({ title: 'Scorelist deleted' });
    await refresh();
  };

  const safeParsePayload = (sl: DigitalScorelist) => { try { return JSON.parse(sl.payload_json || '{}'); } catch { return null; } };
  const readCertifications = (sl: DigitalScorelist): CertificationApproval[] => {
    const direct = readScorelistCertifications(sl);
    if (direct.length > 0) return direct;
    const payload = safeParsePayload(sl);
    const fromPayload = payload?.__certification?.approvals;
    return Array.isArray(fromPayload) ? fromPayload : [];
  };
  const readStatus = (sl: DigitalScorelist, certs: CertificationApproval[]): string => {
    if (sl.certification_status) return sl.certification_status;
    const latest = certs.reduce<string>((best, c) => {
      return stageOrder.indexOf(c.stage as (typeof scorelistStageOrder)[number]) > stageOrder.indexOf(best as (typeof scorelistStageOrder)[number]) ? c.stage : best;
    }, 'draft' as string);
    return latest || 'draft';
  };
  const readLocked = (sl: DigitalScorelist): boolean => {
    if (typeof sl.locked === 'boolean') return sl.locked;
    const payload = safeParsePayload(sl);
    return !!payload?.__certification?.locked;
  };

  const requiredApproversByStage = stageOrder.reduce<Record<string, ManagementUser[]>>((acc, stage) => {
    acc[stage] = managementUsers.filter((m) => resolveStageFromDesignation(m.designation) === stage);
    return acc;
  }, {} as Record<string, ManagementUser[]>);

  const notifyStageApprovers = async (scorelistId: string, stage: string) => {
    const stageRecipients = (requiredApproversByStage[stage] || []).filter((m) => !!String(m.email || '').trim());
    const adminRecipient = getAdminNotificationRecipient();
    const recipients = [...stageRecipients];
    if (adminRecipient && !recipients.some((m) => String(m.email || '').trim().toLowerCase() === adminRecipient)) {
      recipients.push({
        management_id: 'admin',
        name: user?.name || 'Administrator',
        email: adminRecipient,
        phone: '',
        designation: 'Portal Admin',
        role: 'admin',
        authority_level: 10,
        signature_image: '',
        status: 'active',
        created_at: '',
        username: 'admin',
        password: '',
      });
    }
    if (recipients.length === 0) {
      toast({
        title: 'No approver emails configured',
        description: 'Add management or admin mailbox emails before sending stage notifications.',
        variant: 'destructive',
      });
      return;
    }

    const primaryAssignee = recipients[0]?.management_id || '';
    const source = scorelists.find((item) => item.scorelist_id === scorelistId);
    if (source) {
      const updatedScorelist: DigitalScorelist = {
        ...source,
        assignee_id: primaryAssignee,
        due_at: source.due_at || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        priority: source.priority || 'medium',
        escalation_state: source.escalation_state || 'normal',
      };
      await v2api.updateScorelist(updatedScorelist);
      logAudit(user?.management_id || user?.username || 'admin', 'scorelist_assignment_changed', 'scorelist', scorelistId, JSON.stringify({
        stage,
        assignee_id: primaryAssignee,
        due_at: updatedScorelist.due_at,
      }));
    }

    const attempts = await sendScorelistApprovalRequestBulk({
      recipients: recipients.map((m) => ({ to: m.email, approverName: m.name || m.designation || 'Approver' })),
      scorelistId,
      stageLabel: stageLabels[stage] || stage,
      actorName: user?.name || user?.username || 'Admin',
    });
    const failed = attempts.filter((a) => !a.success);
    if (failed.length > 0) {
      const firstFailure = failed[0];
      logAudit(
        user?.management_id || user?.username || 'admin',
        'mail_delivery_failed',
        'scorelist',
        scorelistId,
        JSON.stringify({ stage, failedRecipients: failed.map((f) => f.to), reason: firstFailure.reason }),
      );
      toast({
        title: `Email delivery issue (${failed.length}/${attempts.length} failed)`,
        description: explainMailFailure(firstFailure.reason, firstFailure.raw),
        variant: 'destructive',
      });
      return;
    }
    toast({ title: `Approval emails delivered to ${attempts.length} recipient(s)` });
  };

  const hashSeed = (input: string) => {
    let hash = 0;
    for (let index = 0; index < input.length; index += 1) {
      hash = (hash * 33 + input.charCodeAt(index)) >>> 0;
    }
    return hash;
  };

  const renderVerificationQrMarkup = (verifyUrl: string, scorelistId: string, hashDigest: string, size = 140) => {
    const qrSize = Math.round(size * 0.62);
    const qrOffset = Math.round((size - qrSize) / 2);
    const qrComponentAvailable = typeof QRCodeSVG === 'function';
    const qrMarkup = qrComponentAvailable
      ? renderToStaticMarkup(
          <QRCodeSVG
            value={verifyUrl}
            size={qrSize}
            level="H"
            includeMargin
            bgColor="#ffffff"
            fgColor="#0f5132"
          />,
        ).replace('<svg ', `<svg x="${qrOffset}" y="${qrOffset}" `)
      : `<g transform="translate(${qrOffset} ${qrOffset})"><rect width="${qrSize}" height="${qrSize}" rx="10" ry="10" fill="#ffffff"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="12" fill="#14532d">VERIFY</text></g>`;

    const seed = hashSeed(`${scorelistId}-${hashDigest}`);
    const shortHash = hashDigest.slice(0, 16).toUpperCase();
    const label = scorelistId.toUpperCase();
    const patternText = `${label} • ${shortHash} • `;
    const rotation = -18 + (seed % 9);
    const lineGap = 18 + (seed % 5);
    const stripeGap = 20 + (seed % 7);
    const bandHeight = Math.max(28, Math.round(size * 0.14));
    const whitePad = Math.round(size * 0.19);
    const whiteBox = size - whitePad * 2;
    const safeLabel = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safePatternText = patternText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Verification QR for ${safeLabel}">
        <defs>
          <clipPath id="qr-card-clip-${seed}">
            <rect x="0" y="0" width="${size}" height="${size}" rx="18" ry="18" />
          </clipPath>
        </defs>
        <g clip-path="url(#qr-card-clip-${seed})">
          <rect width="${size}" height="${size}" rx="18" ry="18" fill="#166534" />
          <g transform="rotate(${rotation} ${size / 2} ${size / 2})">
            ${Array.from({ length: 9 }, (_, row) => {
              const y = -26 + row * lineGap;
              return `<text x="-${size * 0.35}" y="${y}" fill="rgba(255,255,255,0.18)" font-family="Arial, sans-serif" font-weight="700" font-size="10" letter-spacing="1.4">${safePatternText.repeat(4)}</text>`;
            }).join('')}
          </g>
          ${Array.from({ length: Math.ceil(size / stripeGap) + 2 }, (_, index) => {
            const x = -10 + index * stripeGap;
            return `<rect x="${x}" y="0" width="5" height="${size}" fill="rgba(255,255,255,0.06)" />`;
          }).join('')}
          <rect x="0" y="0" width="${size}" height="${bandHeight}" fill="rgba(6, 78, 59, 0.82)" />
          <rect x="0" y="${size - bandHeight}" width="${size}" height="${bandHeight}" fill="rgba(6, 78, 59, 0.82)" />
          <text x="${size / 2}" y="${Math.round(bandHeight * 0.66)}" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="13" font-weight="700" letter-spacing="0.8">${safeLabel}</text>
          <text x="${size / 2}" y="${size - Math.round(bandHeight * 0.34)}" text-anchor="middle" fill="rgba(255,255,255,0.94)" font-family="Courier New, monospace" font-size="8.5" font-weight="700" letter-spacing="1">${shortHash}</text>
          <rect x="${whitePad}" y="${whitePad}" width="${whiteBox}" height="${whiteBox}" rx="14" ry="14" fill="#ffffff" stroke="rgba(22,101,52,0.28)" stroke-width="3" />
          ${qrMarkup}
        </g>
      </svg>
    `.trim();
  };

  const securityFeatureItems = [
    {
      title: 'Security Thread',
      description: 'Embedded twin border threads mimic metallic register lines and expose tamper evidence across the page.',
    },
    {
      title: 'Micro-lettering',
      description: 'Magnification-only microtext repeats the document ID, verification URL, and certification statement in the footer band.',
    },
    {
      title: 'Intaglio Printing',
      description: 'Raised-ink styling with embossed shadows highlights the title, certification badge, and verification seal for tactile-style emphasis.',
    },
  ];

  const handleExportPDF = (sl: DigitalScorelist) => {
    const payload = getPayload(sl);
    const match = payload?.match;
    const certs = readCertifications(sl);
    const effectiveStatus = readStatus(sl, certs);
    const effectiveLocked = readLocked(sl);
    const season = payload?.season;
    const tournament = payload?.tournament;
    const payloadMatches = (payload?.matches || []) as any[];

    const roadmap = getScorelistRoadmap(sl, managementUsers);
    const detailedStatus = getScorelistDetailedStatus(sl, managementUsers);
    const pendingApprovals = roadmap.flatMap((step) =>
      step.pendingApprovers.map((approver) => ({ stage: step.stage, name: approver.name, designation: approver.designation })),
    );

    // Build HTML content for print-to-PDF
    const batRows = (payload?.battingData || []).map((b: any) =>
      `<tr><td>${escapeHtml(players.find(p => p.player_id === b.player_id)?.name || b.player_id)}</td><td>${escapeHtml(b.team)}</td><td style="text-align:right;font-weight:bold">${escapeHtml(b.runs)}</td><td style="text-align:right">${escapeHtml(b.balls)}</td><td style="text-align:right">${escapeHtml(b.fours)}</td><td style="text-align:right">${escapeHtml(b.sixes)}</td><td>${escapeHtml(b.how_out || 'not out')}</td></tr>`
    ).join('');
    const bowlRows = (payload?.bowlingData || []).map((b: any) =>
      `<tr><td>${escapeHtml(players.find(p => p.player_id === b.player_id)?.name || b.player_id)}</td><td>${escapeHtml(b.team)}</td><td style="text-align:right">${escapeHtml(b.overs)}</td><td style="text-align:right">${escapeHtml(b.maidens)}</td><td style="text-align:right">${escapeHtml(b.runs_conceded)}</td><td style="text-align:right;font-weight:bold">${escapeHtml(b.wickets)}</td></tr>`
    ).join('');
    const certRows = certs.map(c => `<tr><td>${escapeHtml(c.approver_name)}</td><td>${escapeHtml(c.designation)}</td><td>${escapeHtml(stageLabels[c.stage] || c.stage.replace(/_/g, ' '))}</td><td>${escapeHtml(formatInIST(c.timestamp))}</td><td style="font-family:monospace;font-size:10px">${escapeHtml(truncateDisplay(c.token, 12))}</td></tr>`).join('');
    const draftTimestamp = sl.generated_at || new Date().toISOString();
    const draftBy = sl.generated_by || 'System';
    const verifyUrl = getPublicVerifyScorelistUrl(sl.scorelist_id);
    const normalizedHashDigest = asDisplayText(sl.hash_digest, `NO-HASH-${sl.scorelist_id}`);
    const qrMarkup = renderVerificationQrMarkup(verifyUrl, sl.scorelist_id, normalizedHashDigest, 160);
    const verificationIntaglioId = `${sl.scorelist_id} • ${truncateDisplay(normalizedHashDigest, 16).toUpperCase()}`;
    const verificationIntaglioBands = Array.from({ length: 8 }, (_, index) => `${verificationIntaglioId} • INTAGLIO VERIFIED • `).join('');
    const securityFeaturesMarkup = securityFeatureItems.map((feature) => `
      <div class="security-feature-card">
        <div class="security-feature-title">${feature.title}</div>
        <p>${feature.description}</p>
      </div>`).join('');
    const registrationBandMarkup = buildRegistrationBandMarkup(sl.scorelist_id);
    const draftRow = `<tr><td>${escapeHtml(draftBy)}</td><td>Scorelist Engine</td><td>${escapeHtml(stageLabels.draft)}</td><td>${escapeHtml(formatInIST(draftTimestamp))}</td><td style="font-family:monospace;font-size:10px">DRAFT</td></tr>`;
    const certTimelineRows = `${draftRow}${certRows}`;
    const pendingRows = pendingApprovals.map((p) => `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.designation)}</td><td>${escapeHtml(stageLabels[p.stage] || p.stage)}</td><td>Pending with ${escapeHtml(p.designation)}</td></tr>`).join('');
    
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
      const matchBatRows = matchBat.map((b: any) => `<tr><td>${escapeHtml(players.find(p => p.player_id === b.player_id)?.name || b.player_id)}</td><td>${escapeHtml(b.team)}</td><td style="text-align:right;font-weight:bold">${escapeHtml(b.runs)}</td><td style="text-align:right">${escapeHtml(b.balls)}</td><td style="text-align:right">${escapeHtml(b.fours)}</td><td style="text-align:right">${escapeHtml(b.sixes)}</td><td>${escapeHtml(b.how_out || 'not out')}</td></tr>`).join('');
      const matchBowlRows = matchBowl.map((b: any) => `<tr><td>${escapeHtml(players.find(p => p.player_id === b.player_id)?.name || b.player_id)}</td><td>${escapeHtml(b.team)}</td><td style="text-align:right">${escapeHtml(b.overs)}</td><td style="text-align:right">${escapeHtml(b.maidens)}</td><td style="text-align:right">${escapeHtml(b.runs_conceded)}</td><td style="text-align:right;font-weight:bold">${escapeHtml(b.wickets)}</td></tr>`).join('');
      return `
      <div class="match-book-page" style="margin-top:22px;padding-top:12px;border-top:1px solid #ddd;page-break-inside:avoid">
        <h2>Match ${idx + 1}: ${escapeHtml(m.team_a)} vs ${escapeHtml(m.team_b)}</h2>
        <p><strong>Date:</strong> ${escapeHtml(m.date || '-')} | <strong>Venue:</strong> ${escapeHtml(m.venue || '-')} | <strong>Stage:</strong> ${escapeHtml(m.match_stage || '-')} | <strong>Status:</strong> ${escapeHtml(m.status || '-')}</p>
        <p><strong>Score:</strong> ${escapeHtml(m.team_a)} ${escapeHtml(scoreA)} vs ${escapeHtml(m.team_b)} ${escapeHtml(scoreB)}</p>
        <p><strong>Result:</strong> ${escapeHtml(m.result || '-')} ${m.man_of_match ? `| <strong>Man of the Match:</strong> ${escapeHtml(getMomDisplayLabel(m.man_of_match))}` : ''}</p>
        <h3>Batting</h3>
        <table><tr><th>Batter</th><th>Team</th><th style="text-align:right">R</th><th style="text-align:right">B</th><th style="text-align:right">4s</th><th style="text-align:right">6s</th><th>Dismissal</th></tr>${matchBatRows || '<tr><td colspan="7" style="text-align:center;color:#777">No batting entries</td></tr>'}</table>
        <h3>Bowling</h3>
        <table><tr><th>Bowler</th><th>Team</th><th style="text-align:right">O</th><th style="text-align:right">M</th><th style="text-align:right">R</th><th style="text-align:right">W</th></tr>${matchBowlRows || '<tr><td colspan="6" style="text-align:center;color:#777">No bowling entries</td></tr>'}</table>
      </div>`;
    }).join('');

    const securePattern = buildSecurePatternLayer({
      matchId: sl.match_id || payloadMatches[0]?.match_id || 'TOURNAMENT',
      checksum: truncateDisplay(normalizedHashDigest, 12),
      timestamp: String(sl.generated_at || '').replace(/[^0-9A-Za-z]/g, ''),
      enableSecurePattern: true,
    });

    const html = `<!DOCTYPE html><html><head><title>Scorelist ${sl.scorelist_id}</title>
<style>* { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; } body{font-family:Arial,sans-serif;margin:40px 94px 54px 40px;color:#1a1a1a;position:relative;background-color:#fff;background-image:repeating-linear-gradient(45deg, rgba(30, 107, 58, 0.03) 25%, transparent 25%, transparent 75%, rgba(30, 107, 58, 0.03) 75%, rgba(30, 107, 58, 0.03)), repeating-linear-gradient(45deg, rgba(30, 107, 58, 0.03) 25%, transparent 25%, transparent 75%, rgba(30, 107, 58, 0.03) 75%, rgba(30, 107, 58, 0.03));background-size:20px 20px;background-position:0 0,10px 10px}h1{text-align:center;color:#1e6b3a}h2{color:#1e6b3a;border-bottom:2px solid #1e6b3a;padding-bottom:4px}
table{width:100%;border-collapse:collapse;margin:10px 0;background:rgba(255,255,255,0.94)}th,td{border:1px solid #ddd;padding:6px 8px;font-size:12px}th{background:#f0f7f0;text-align:left}
.scoreboard{display:flex;justify-content:space-around;text-align:center;background:rgba(240,247,240,0.96);padding:20px;border-radius:8px;margin:20px 0;border:1px solid rgba(30,107,58,0.14)}
.team-score{font-size:28px;font-weight:bold;color:#1e6b3a}.watermark{position:fixed;top:40%;left:10%;transform:rotate(-30deg);font-size:80px;color:rgba(30,107,58,0.04);white-space:nowrap;pointer-events:none;z-index:-1}.secure-pattern{position:fixed;inset:0;pointer-events:none;z-index:-3}.secure-pattern-notice{margin:10px 0 18px;padding:10px 14px;border:1px dashed #7ab28d;border-radius:10px;background:rgba(232,245,233,0.92);color:#145c36;font-size:11px;font-weight:700;letter-spacing:0.08em;text-align:center;text-transform:uppercase}
.footer{text-align:center;font-size:9px;color:#999;margin-top:30px;border-top:1px solid #ddd;padding-top:10px;position:relative;z-index:1;background:rgba(255,255,255,0.78)}
.certified{background:#e8f5e9;border:2px solid #1e6b3a;text-align:center;padding:12px;border-radius:8px;font-weight:bold;color:#1e6b3a;margin:20px 0;text-shadow:0.5px 0.5px 0px rgba(255,255,255,0.8), -0.5px -0.5px 0px rgba(0,0,0,0.3)}
.match-book-page{page-break-before:always}
.intaglio{letter-spacing:0.12em;text-transform:uppercase;font-weight:900;text-shadow:0.8px 0.8px 0 rgba(255,255,255,0.92), -0.8px -0.8px 0 rgba(0,0,0,0.42), 0 0 1px rgba(10,70,35,0.55), 0 0 2px rgba(10,70,35,0.35);color:#0d4b27;-webkit-text-stroke:0.35px rgba(7,55,28,0.75);filter:contrast(1.12) saturate(1.08)}
.security-grid{position:fixed;inset:0;pointer-events:none;z-index:-2;background-image:repeating-linear-gradient(45deg, rgba(30, 107, 58, 0.03) 25%, transparent 25%, transparent 75%, rgba(30, 107, 58, 0.03) 75%, rgba(30, 107, 58, 0.03)), repeating-linear-gradient(45deg, rgba(30, 107, 58, 0.03) 25%, transparent 25%, transparent 75%, rgba(30, 107, 58, 0.03) 75%, rgba(30, 107, 58, 0.03));background-size:20px 20px;background-position:0 0,10px 10px}
.security-thread{position:fixed;top:0;bottom:0;right:14px;width:15px;pointer-events:none;z-index:-1;background:repeating-linear-gradient(180deg, rgba(11,89,53,0.3) 0px, rgba(255,255,255,0.4) 4px, rgba(194,160,63,0.3) 8px);box-shadow:inset 0 0 4px rgba(0,0,0,0.1)}
.registration-band{position:fixed;top:92px;bottom:96px;right:34px;width:44px;pointer-events:none;z-index:0;border-radius:18px;border:1px solid rgba(20,92,54,0.34);background:linear-gradient(180deg, rgba(255,255,255,0.98), rgba(232,245,233,0.96) 34%, rgba(255,255,255,0.98));box-shadow:inset 0 0 0 1px rgba(255,255,255,0.88), inset 0 0 18px rgba(20,92,54,0.08), 0 0 0 1px rgba(20,92,54,0.04)}.registration-band::before{content:'';position:absolute;inset:14px 8px;border-radius:14px;background:linear-gradient(180deg, rgba(196,223,204,0.36), rgba(255,255,255,0.06) 22%, rgba(255,255,255,0.06) 78%, rgba(196,223,204,0.36));box-shadow:inset 0 0 0 1px rgba(20,92,54,0.08)}.registration-band-label{position:absolute;left:50%;bottom:-72px;width:150px;transform:translateX(-50%) rotate(90deg);transform-origin:center;white-space:nowrap;font-size:8px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:rgba(20,92,54,0.72)}.registration-band-rows{position:absolute;inset:18px 8px;display:grid;grid-template-rows:repeat(16,minmax(0,1fr));gap:4px}.registration-row{position:relative;display:flex;align-items:center;justify-content:center;min-height:0;overflow:hidden;border-radius:999px;background:linear-gradient(90deg, rgba(20,92,54,0.06), rgba(255,255,255,0.96) 28%, rgba(255,255,255,0.96) 72%, rgba(20,92,54,0.06));box-shadow:inset 0 0 0 1px rgba(20,92,54,0.05)}.registration-half,.registration-window{position:absolute;left:50%;top:50%;font-family:'Arial Black',Arial,sans-serif;font-size:9px;font-weight:900;letter-spacing:0.08em;white-space:nowrap;transform:translate(-50%,-50%) rotate(var(--row-rotation));transform-origin:center center}.registration-half-front{color:transparent;-webkit-text-stroke:0.75px rgba(20,92,54,0.92);clip-path:inset(0 50% 0 0)}.registration-window{color:rgba(255,255,255,0.98);text-shadow:0 0 1px rgba(255,255,255,0.98), 0 0 6px rgba(255,255,255,0.95);font-size:8px;letter-spacing:0.14em}.registration-half-back{color:rgba(20,92,54,0.78);clip-path:inset(0 0 0 50%);text-shadow:0.25px 0.25px 0 rgba(255,255,255,0.72)}
.microtext{position:fixed;left:18px;right:92px;bottom:10px;overflow:hidden;white-space:nowrap;text-align:left;font-size:6px;letter-spacing:2px;color:rgba(10,89,52,0.6);opacity:0.6;pointer-events:none;z-index:-1;text-transform:uppercase}
.cert-grid{border:1px solid #b7d5c0;background-image:linear-gradient(rgba(30,107,58,0.08) 1px, transparent 1px),linear-gradient(90deg, rgba(30,107,58,0.08) 1px, transparent 1px);background-size:18px 18px;padding:8px;border-radius:8px;background-color:rgba(255,255,255,0.9)}
.status-chip{display:inline-block;margin:8px auto 0;padding:4px 10px;border-radius:999px;background:#e8f5e9;border:1px solid #8ac8a1;color:#145c36;font-weight:bold;font-size:11px;text-shadow:0.5px 0.5px 0px rgba(255,255,255,0.8), -0.5px -0.5px 0px rgba(0,0,0,0.3)}.verification-panel{position:relative;display:flex;gap:18px;align-items:center;justify-content:space-between;margin:18px 0 24px;padding:18px 18px 20px;border:1px solid #b7d5c0;border-radius:12px;background:linear-gradient(135deg, rgba(232,245,233,0.94), rgba(244,250,246,0.99));overflow:hidden;isolation:isolate}.verification-panel::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg, rgba(255,255,255,0.34), rgba(30,107,58,0.03));z-index:0}.verification-panel::after{content:'';position:absolute;inset:12px;border:1px solid rgba(20,92,54,0.14);border-radius:10px;z-index:0}.verification-copy,.verification-qr{position:relative;z-index:2}.verification-copy{flex:1}.verification-copy p{margin:4px 0}.verification-url{font-family:monospace;font-size:11px;word-break:break-all;color:#145c36}.verification-qr{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:12px;border:1px solid #9cc8ab;background:#fff;box-shadow:inset 0 0 0 4px rgba(30,107,58,0.06)}.verification-qr-id{font-family:'Courier New',monospace;font-size:9px;line-height:1.2;letter-spacing:1.6px;text-transform:uppercase;color:#0f5132;font-weight:700;text-align:center;word-break:break-word;max-width:164px}.verification-intaglio-field{position:absolute;inset:10px 10px 10px 10px;pointer-events:none;z-index:1;overflow:hidden}.verification-intaglio-field .band{display:block;white-space:nowrap;font-family:'Courier New',monospace;font-size:12px;line-height:1.9;letter-spacing:2.8px;text-transform:uppercase;color:rgba(11,89,53,0.17);text-shadow:0.45px 0.45px 0 rgba(255,255,255,0.75), -0.45px -0.45px 0 rgba(8,56,29,0.18);transform:rotate(-12deg) translateX(-40px);transform-origin:left center}.verification-intaglio-badge{display:inline-flex;align-items:center;gap:8px;margin:8px 0 6px;padding:6px 12px;border-radius:999px;border:1px solid rgba(20,92,54,0.26);background:rgba(255,255,255,0.72);color:#145c36;font-size:10px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase}.verification-intaglio-meta{margin-top:8px;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#145c36;font-weight:700}.security-features{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:18px 0 22px}.security-feature-card{border:1px solid #b7d5c0;border-radius:10px;background:rgba(252,254,253,0.94);padding:12px 14px}.security-feature-card p{margin:6px 0 0;font-size:11px;line-height:1.45;color:#355244}.security-feature-title{font-weight:700;color:#124928}.security-seal{display:inline-flex;align-items:center;gap:8px;padding:7px 12px;border-radius:999px;border:1px solid #7ab28d;background:#fff;color:#145c36;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em}

@media print{ .watermark{display:block;} * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; } }</style></head><body>
${securePattern.enabled ? `<div class="secure-pattern" style="${securePattern.style}"></div>` : ''}
<div class="security-grid"></div>
<div class="security-thread"></div>
${registrationBandMarkup}
<div class="microtext">${`${sl.scorelist_id} • ${normalizedHashDigest} • `.repeat(18)}${securePattern.enabled ? `${securePattern.microtext} • ` : ''}</div>
<div class="watermark">VERIFIED MATCH RECORD</div>
<p style="text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:3px;color:#666">Cricket Club Portal</p>
<h1 class="intaglio">Digital ${sl.scope_type === 'match' ? 'Match' : 'Tournament'} Scorelist</h1>
<p style="text-align:center;font-family:monospace;font-size:11px;color:#999">${escapeHtml(sl.scorelist_id)}</p>
${securePattern.enabled ? `<div class="secure-pattern-notice">Visible anti-copy background active • ${securePattern.visibleLabel}</div>` : ''}
<p style="text-align:center"><span class="status-chip intaglio">${detailedStatus}${effectiveLocked ? ' • LOCKED' : ''}</span></p>
<div class="verification-panel">
  <div class="verification-intaglio-field">
    ${Array.from({ length: 6 }, () => `<span class="band">${verificationIntaglioBands}</span>`).join('')}
  </div>
  <div class="verification-copy">
    <div class="security-seal intaglio">QR Verification Enabled</div>
    <div class="verification-intaglio-badge intaglio">Visible intaglio print • ${escapeHtml(sl.scorelist_id)}</div>
    <p><strong>Verify this scorelist instantly:</strong> scan the QR code or open the secure verification URL below.</p>
    <p class="verification-url">${escapeHtml(verifyUrl)}</p>
    <p style="font-size:11px;color:#355244">The QR target is bound to this document ID so reviewers can confirm hash-backed authenticity from the verification page.</p>
    <p class="verification-intaglio-meta intaglio">Intaglio ID: ${verificationIntaglioId}</p>
  </div>
  <div class="verification-qr">${qrMarkup}<div class="verification-qr-id intaglio">${verificationIntaglioId}</div></div>
</div>
<div class="security-features">${securityFeaturesMarkup}</div>
<p style="text-align:center;margin:6px 0"><strong>Tournament:</strong> ${escapeHtml(tournament?.name || '-')} | <strong>Format:</strong> ${escapeHtml(tournament?.format || '-')} | <strong>Overs:</strong> ${escapeHtml(tournament?.overs || '-')}</p>
<p style="text-align:center;margin:6px 0"><strong>Season:</strong> ${escapeHtml(season?.year || '-')} | <strong>Dates:</strong> ${escapeHtml(season?.start_date || '-')} to ${escapeHtml(season?.end_date || '-')}</p>
${match ? `<div class="scoreboard"><div><h3>${escapeHtml(match.team_a)}</h3><div class="team-score">${escapeHtml(aScore)}</div></div><div style="display:flex;align-items:center"><span style="font-size:24px;color:#999">VS</span></div><div><h3>${escapeHtml(match.team_b)}</h3><div class="team-score">${escapeHtml(bScore)}</div></div></div>` : ''}
${match?.result ? `<p style="text-align:center;font-size:16px;font-weight:bold;color:#1e6b3a">${escapeHtml(match.result)}</p>` : ''}
${match?.man_of_match ? `<p style="text-align:center">🏅 Man of the Match: ${escapeHtml(getMomDisplayLabel(match.man_of_match))}</p>` : ''}
${payloadMatches.length > 0 ? `<p style="text-align:center;font-weight:bold;background:#f9fcf9;padding:10px;border:1px solid #dbe7db;border-radius:6px">Tournament Scorebook: ${payloadMatches.length} matches included with complete match-wise scorecards.</p>` : ''}
<h2>🏏 Batting Scorecard</h2><table><tr><th>Batter</th><th>Team</th><th style="text-align:right">R</th><th style="text-align:right">B</th><th style="text-align:right">4s</th><th style="text-align:right">6s</th><th>Dismissal</th></tr>${batRows}</table>
<h2>🎯 Bowling Figures</h2><table><tr><th>Bowler</th><th>Team</th><th style="text-align:right">O</th><th style="text-align:right">M</th><th style="text-align:right">R</th><th style="text-align:right">W</th></tr>${bowlRows}</table>
${tournamentMatchBlocks}
<h2>🏛️ Certification Timeline</h2><div class="cert-grid"><table><tr><th>Name</th><th>Designation</th><th>Stage</th><th>Timestamp</th><th>Token</th></tr>${certTimelineRows}</table></div>
<h2>🧾 Pending Approvals</h2><table><tr><th>Name</th><th>Designation</th><th>Required Stage</th><th>Status</th></tr>${pendingRows || '<tr><td colspan="4" style="text-align:center;color:#1e6b3a;font-weight:bold">All required approvals completed</td></tr>'}</table>
${effectiveLocked ? '<div class="certified intaglio">✔ OFFICIALLY CERTIFIED MATCH RESULT</div>' : ''}
<div class="footer"><p>Document ID: ${escapeHtml(sl.scorelist_id)} | Hash: ${escapeHtml(truncateDisplay(normalizedHashDigest, 32))}...</p><p>Official League Record • Tampering Invalidates Document • This document is digitally certified. Any alteration invalidates authenticity.</p></div>
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
    await v2api.updateScorelist({
      ...sl,
      certification_status: stage,
      certifications_json: JSON.stringify(certs),
      locked,
    });
    logAudit(userId, 'certify_scorelist', 'scorelist', sl.scorelist_id, stage);
    const nextStage = stageOrder[stageOrder.indexOf(stage as (typeof scorelistStageOrder)[number]) + 1];
    if (nextStage && !locked) {
      await notifyStageApprovers(sl.scorelist_id, nextStage);
    }
    toast({ title: `✅ Certified: ${stageLabels[stage] || stage}` });
    refresh();
  };

  const getPayload = (sl: DigitalScorelist) => { try { return JSON.parse(sl.payload_json); } catch { return null; } };

  // Determine which certification stage this management user can approve
  const userStage = isManagement && user?.designation ? resolveStageFromDesignation(user.designation) : null;

  const getNextStage = (sl: DigitalScorelist): string | null => {
    const current = sl.certification_status || 'draft';
    const idx = stageOrder.indexOf(current as (typeof scorelistStageOrder)[number]);
    if (idx < stageOrder.length - 1) return stageOrder[idx + 1];
    return null;
  };

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    </div>
  );

  if (loadError && scorelists.length === 0) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button onClick={() => { setLoading(true); void refresh(); }}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold">🛡️ Digital Scorelists</h1>
        {loadError && (
          <Card className="border-destructive/30">
            <CardContent className="flex flex-col gap-3 p-4 text-sm md:flex-row md:items-center md:justify-between">
              <p className="text-destructive">{loadError}</p>
              <Button size="sm" variant="outline" onClick={() => void refresh()}>Retry refresh</Button>
            </CardContent>
          </Card>
        )}

        {/* Generate - Admin Only */}
        {isAdmin && (
          <Card>
            <CardHeader><CardTitle className="font-display text-sm md:text-base">Generate Scorelist</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <Select value={selectedMatch} onValueChange={setSelectedMatch}>
                  <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Select Match" /></SelectTrigger>
                  <SelectContent>
                    {matches.map(m => <SelectItem key={m.match_id} value={m.match_id}>{formatMatchOptionLabel(m.match_id)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleGenerateMatch}
                  loading={generating}
                  loadingText="Generating match scorelist..."
                  disabled={!selectedMatch}
                  className="w-full sm:w-auto"
                >
                  Generate Match
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <Select value={selectedTournament} onValueChange={(value) => { setSelectedTournament(value); setSelectedSeason(''); }}>
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
                <Button
                  onClick={handleGenerateTournament}
                  loading={generating}
                  loadingText="Generating tournament scorebook..."
                  disabled={!selectedTournament || !selectedSeason}
                  className="w-full sm:w-auto"
                >
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
            const roadmap = getScorelistRoadmap(sl, managementUsers);
            const detailedStatus = getScorelistDetailedStatus(sl, managementUsers);
            const userId = user?.management_id || user?.username || 'admin';
            const alreadySignedThisStage = certs.some(c => c.approver_id === userId && c.stage === userStage);

            return (
              <Card key={sl.scorelist_id} className={`transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${effectiveLocked ? 'border-primary/40 bg-primary/5' : ''}`}>
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
                        {effectiveLocked ? '🔒 ' : ''}{detailedStatus}
                      </Badge>
                    </div>
                  </div>

                  {/* Mini certification timeline */}
                  <div className="flex flex-wrap gap-1">
                    {stageOrder.map(stage => {
                      const cert = stage === 'draft'
                        ? { approver_name: sl.generated_by || 'System', timestamp: sl.generated_at || '', token: 'DRAFT', stage: 'draft' }
                        : certs.find(c => c.stage === stage);
                      return (
                        <Badge key={stage} variant={cert ? 'default' : 'outline'} className={`text-[10px] ${cert ? 'bg-primary/80 text-primary-foreground' : 'opacity-40'}`}>
                          {cert ? '✓' : '○'} {stageLabels[stage]?.split(' ')[0]}
                        </Badge>
                      );
                    })}
                  </div>

                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                    {roadmap.map((step) => (
                      <div key={step.stage} className={`rounded-lg border p-3 text-xs ${step.completed ? 'border-primary/20 bg-primary/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                        <p className="font-semibold">{step.label}</p>
                        <p className="mt-1 text-muted-foreground">{step.completed ? (step.approvals[0] ? `Completed by ${step.approvals[0].designation}` : 'Completed') : (step.pendingApprovers.length > 0 ? `Pending with ${step.pendingApprovers.map((member) => member.designation || member.name).join(', ')}` : `Pending at ${step.label}`)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleVerify(sl)} className="gap-1 text-xs">
                      <Eye className="h-3 w-3" /> View & Verify
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleExportJSON(sl)} className="gap-1 text-xs">
                      <FileText className="h-3 w-3" /> JSON
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
                    {isAdmin && (
                      <Button size="sm" variant="destructive" onClick={() => void handleDeleteScorelist(sl)} className="gap-1 text-xs">
                        <ShieldX className="h-3 w-3" /> Delete
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
              const roadmap = getScorelistRoadmap(viewScorelist, managementUsers);
              const detailedStatus = getScorelistDetailedStatus(viewScorelist, managementUsers);
              const calcScore = (team: string) => {
                const rows = (payload?.battingData || []).filter((b: any) => b.team === team);
                const runs = rows.reduce((s: number, b: any) => s + (b.runs || 0), 0);
                const wkts = rows.filter((b: any) => b.how_out && b.how_out !== 'not out' && b.how_out !== '').length;
                const balls = rows.reduce((s: number, b: any) => s + (b.balls || 0), 0);
                const overs = Math.floor(balls / 6) + (balls % 6) / 10;
                return { runs, wkts, overs: overs.toFixed(1) };
              };

              return (
                <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-white/95 p-3 md:p-4 before:pointer-events-none before:absolute before:inset-0 before:bg-[repeating-linear-gradient(45deg,rgba(30,107,58,0.03)_25%,transparent_25%,transparent_75%,rgba(30,107,58,0.03)_75%,rgba(30,107,58,0.03)),repeating-linear-gradient(45deg,rgba(30,107,58,0.03)_25%,transparent_25%,transparent_75%,rgba(30,107,58,0.03)_75%,rgba(30,107,58,0.03))] before:bg-[length:20px_20px] before:bg-[position:0_0,10px_10px]">
                  <div className="pointer-events-none absolute bottom-2 left-10 right-3 overflow-hidden whitespace-nowrap text-left font-mono text-[6px] uppercase tracking-[0.35em] text-primary/60 opacity-60">
                    {`${`${viewScorelist.scorelist_id} • ${viewScorelist.hash_digest} • `.repeat(10)}`}
                  </div>
                  <div className="pointer-events-none absolute inset-y-0 right-3 w-[15px] rounded-sm bg-[repeating-linear-gradient(180deg,rgba(11,89,53,0.3)_0px,rgba(255,255,255,0.4)_4px,rgba(194,160,63,0.3)_8px)] shadow-[inset_0_0_4px_rgba(0,0,0,0.1)]"></div>
                  <div className="pointer-events-none absolute bottom-24 right-[1.55rem] top-20 z-[1] w-11 rounded-[18px] border border-primary/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(232,245,233,0.96)_34%,rgba(255,255,255,0.98))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.88),inset_0_0_18px_rgba(20,92,54,0.08),0_0_0_1px_rgba(20,92,54,0.04)]">
                    <div className="absolute inset-[14px_8px] rounded-[14px] bg-[linear-gradient(180deg,rgba(196,223,204,0.36),rgba(255,255,255,0.06)_22%,rgba(255,255,255,0.06)_78%,rgba(196,223,204,0.36))] shadow-[inset_0_0_0_1px_rgba(20,92,54,0.08)]" />
                    <div className="absolute inset-[18px_8px] grid gap-1" style={{ gridTemplateRows: `repeat(${registrationBandRows}, minmax(0, 1fr))` }}>
                      {Array.from({ length: registrationBandRows }, (_, index) => {
                        const rotation = index % 2 === 0 ? '-90deg' : '90deg';
                        return (
                          <div key={index} className="relative overflow-hidden rounded-full bg-[linear-gradient(90deg,rgba(20,92,54,0.06),rgba(255,255,255,0.96)_28%,rgba(255,255,255,0.96)_72%,rgba(20,92,54,0.06))] shadow-[inset_0_0_0_1px_rgba(20,92,54,0.05)]">
                            <span className="absolute left-1/2 top-1/2 whitespace-nowrap font-black tracking-[0.08em] text-transparent [-webkit-text-stroke:0.75px_rgba(20,92,54,0.92)]" style={{ transform: `translate(-50%, -50%) rotate(${rotation})`, clipPath: 'inset(0 50% 0 0)', fontSize: '9px' }}>
                              {viewScorelist.scorelist_id.toUpperCase()}
                            </span>
                            <span className="absolute left-1/2 top-1/2 whitespace-nowrap font-black tracking-[0.14em] text-white" style={{ transform: `translate(-50%, -50%) rotate(${rotation})`, textShadow: '0 0 1px rgba(255,255,255,0.98), 0 0 6px rgba(255,255,255,0.95)', fontSize: '8px' }}>
                              {viewScorelist.scorelist_id.toUpperCase()}
                            </span>
                            <span className="absolute left-1/2 top-1/2 whitespace-nowrap font-black tracking-[0.08em] text-primary/80" style={{ transform: `translate(-50%, -50%) rotate(${rotation})`, clipPath: 'inset(0 0 0 50%)', textShadow: '0.25px 0.25px 0 rgba(255,255,255,0.72)', fontSize: '9px' }}>
                              {viewScorelist.scorelist_id.toUpperCase()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="absolute -bottom-16 left-1/2 w-36 -translate-x-1/2 rotate-90 whitespace-nowrap text-center text-[8px] font-bold uppercase tracking-[0.22em] text-primary/70">
                      Registered denomination • Scorelist ID
                    </div>
                  </div>

                  {/* Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                    <p className="text-4xl md:text-6xl font-display font-bold text-muted/10 rotate-[-30deg] whitespace-nowrap select-none">
                      VERIFIED MATCH RECORD
                    </p>
                  </div>

                  <div className="relative z-10 space-y-4 pb-5 pr-6 md:space-y-6 md:pr-7">
                    {/* Header */}
                    <div className="border-b border-primary/20 pb-4 text-center">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">Cricket Club Portal</p>
                      <h2 className="font-display text-xl font-bold text-primary md:text-2xl [text-shadow:0.5px_0.5px_0px_rgba(255,255,255,0.8),-0.5px_-0.5px_0px_rgba(0,0,0,0.3)]">Digital {viewScorelist.scope_type === 'match' ? 'Match' : 'Tournament'} Scorelist</h2>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{viewScorelist.scorelist_id}</p>
                      <p className="mt-2 text-xs text-muted-foreground"><span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-semibold uppercase tracking-[0.2em] text-primary [text-shadow:0.5px_0.5px_0px_rgba(255,255,255,0.8),-0.5px_-0.5px_0px_rgba(0,0,0,0.3)]">{detailedStatus}</span></p>
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
                          {match.man_of_match && <p className="text-sm text-muted-foreground">🏅 MOM: {getMomDisplayLabel(match.man_of_match)}</p>}
                        </CardContent>
                      </Card>
                    )}

                    <Card>
                      <CardHeader><CardTitle className="font-display text-sm">Approval roadmap</CardTitle></CardHeader>
                      <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                        {roadmap.map((step) => (
                          <div key={step.stage} className={`rounded-lg border p-3 text-xs ${step.completed ? 'border-primary/20 bg-primary/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                            <p className="font-semibold">{step.label}</p>
                            <p className="mt-1 text-muted-foreground">{step.completed ? (step.approvals[0] ? `Completed by ${step.approvals[0].designation}` : 'Completed') : (step.pendingApprovers.length > 0 ? `Pending with ${step.pendingApprovers.map((member) => member.designation || member.name).join(', ')}` : `Pending at ${step.label}`)}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Certification Timeline */}
                    <Card className="border-2 border-accent/30 transition-all duration-300">
                      <CardHeader><CardTitle className="font-display text-sm">🏛️ Certification Timeline</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        {stageOrder.map(stage => {
                          const cert = stage === 'draft'
                            ? {
                                approver_name: viewScorelist.generated_by || 'System',
                                designation: 'Scorelist Engine',
                                timestamp: viewScorelist.generated_at || '',
                                token: 'DRAFT',
                                stage: 'draft',
                              }
                            : certs.find(c => c.stage === stage);
                          return (
                            <div key={stage} className={`flex items-center gap-3 p-2 rounded text-sm ${cert ? 'bg-primary/5 border border-primary/20' : 'opacity-40'}`}>
                              {cert ? <CheckCircle className="h-4 w-4 text-primary shrink-0" /> : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium capitalize text-xs md:text-sm">{stageLabels[stage]}</p>
                                {cert && <p className="text-xs text-muted-foreground truncate">{cert.approver_name} – {cert.designation} • {formatInIST(cert.timestamp)}</p>}
                              </div>
                              {cert && <Badge variant="outline" className="text-[10px] font-mono shrink-0">{truncateDisplay(cert.token, 10)}</Badge>}
                            </div>
                          );
                        })}

                        {effectiveLocked && (
                          <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm font-semibold text-primary [text-shadow:0.5px_0.5px_0px_rgba(255,255,255,0.8),-0.5px_-0.5px_0px_rgba(0,0,0,0.3)]">
                            <Lock className="h-4 w-4" /> ✔ OFFICIALLY CERTIFIED MATCH RESULT
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* QR + Security */}
                    <details className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4 md:p-5">
                      <summary className="cursor-pointer list-none text-sm font-semibold text-primary">Security & QR verification details</summary>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6">
                        <div className="rounded-xl border border-primary/20 bg-white p-3 shadow-sm" dangerouslySetInnerHTML={{ __html: renderVerificationQrMarkup(getPublicVerifyScorelistUrl(viewScorelist.scorelist_id), viewScorelist.scorelist_id, asDisplayText(viewScorelist.hash_digest, `NO-HASH-${viewScorelist.scorelist_id}`), 148) }} />
                        <div className="text-sm text-center sm:text-left">
                          <p className="font-semibold">Scan to Verify</p>
                          <p className="text-xs text-muted-foreground font-mono break-all max-w-[250px]">{getPublicVerifyScorelistUrl(viewScorelist.scorelist_id)}</p>
                          <p className="text-xs text-muted-foreground mt-2">This same QR code is embedded in the exported PDF for fast verification.</p>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3 text-left">
                        {securityFeatureItems.map((feature) => (
                          <div key={feature.title} className="rounded-lg border bg-background/90 p-3 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{feature.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                          </div>
                        ))}
                      </div>
                    </details>

                    {/* Export from dialog */}
                    <div className="flex flex-wrap gap-2 justify-center border-t pt-4">
                      <Button size="sm" variant="outline" onClick={() => handleExportPDF(viewScorelist)} className="gap-1">
                        <Download className="h-3 w-3" /> Download PDF
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleExportJSON(viewScorelist)} className="gap-1">
                        <FileText className="h-3 w-3" /> Download JSON
                      </Button>
                    </div>

                    {/* Security Footer */}
                    <div className="space-y-1 border-t border-primary/20 pt-4 text-center">
                      <p className="text-xs text-muted-foreground font-mono">Document ID: {viewScorelist.scorelist_id}</p>
                      <p className="text-xs text-muted-foreground font-mono">Integrity Hash: {truncateDisplay(viewScorelist.hash_digest, 32)}...</p>
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

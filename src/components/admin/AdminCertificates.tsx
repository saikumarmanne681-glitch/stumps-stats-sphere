import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useData } from '@/lib/DataContext';
import { CertificateRecord } from '@/lib/v2types';
import { istNow, logAudit, v2api } from '@/lib/v2api';
import { generateId } from '@/lib/utils';

import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Trophy, Medal, Award, Download, Eye, FileText, PaintBucket } from 'lucide-react';
import { downloadCertificatePdf, previewCertificatePdf } from '@/lib/certificatePdf';
import { resolvePlayerFromIdentity } from '@/lib/dataUtils';
import { sendSystemEmail } from '@/lib/mailer';
import { buildCertificateTamperEvidentPayload, createVerificationToken, buildCertificateVerificationUrl, createCertificateDigest, withResolvedCertificateSecurity } from '@/lib/certificateSecurity';
import CertificateArtboard from '@/components/CertificateArtboard';
import { queueCanvaCertificateRender, pollCanvaCertificateRender } from '@/lib/canva';

type CertType = CertificateRecord['certificate_type'];
type CertTemplate = CertificateRecord['certificate_template'];
type ApprovalMap = Record<'Treasurer' | 'Scoring Official' | 'Match Referee', boolean>;

type SignatureEntry = {
  role: keyof ApprovalMap;
  signerId: string;
  signerName: string;
  signedAt: string;
};

const certCatalog: Array<{ value: CertType; label: string; icon: string }> = [
  { value: 'winner_team', label: 'Tournament Winner Merit', icon: '🏆' },
  { value: 'runner_up_team', label: 'Tournament Runner-up Merit', icon: '🥈' },
  { value: 'man_of_tournament_runs', label: 'Man of Tournament (Runs)', icon: '🏏' },
  { value: 'man_of_tournament_wickets', label: 'Man of Tournament (Wickets)', icon: '🎯' },
  { value: 'man_of_tournament_all_round', label: 'Man of Tournament (All-round)', icon: '⭐' },
  { value: 'man_of_match', label: 'Man of the Match', icon: '🔥' },
];

const templateCatalog: Array<{ value: CertTemplate; label: string; border: string; bg: string; accent: string; heading: string }> = [
  { value: 'classic', label: 'Regal Ivory', border: '#8c6a2e', bg: '#fefaf0', accent: '#caa35d', heading: '#1f2f5e' },
  { value: 'premium', label: 'Royal Sapphire', border: '#1e4db8', bg: '#f1f6ff', accent: '#78a8ff', heading: '#17306a' },
  { value: 'gold', label: 'Imperial Gold', border: '#97721a', bg: '#fff9e7', accent: '#d2a93d', heading: '#3f2c07' },
  { value: 'heritage', label: 'Cricket Heritage', border: '#991b1b', bg: '#fdf6f4', accent: '#dc2626', heading: '#450a0a' },
  { value: 'artdeco', label: 'Art Deco', border: '#047857', bg: '#f0faf5', accent: '#10b981', heading: '#064e3b' },
];

export function AdminCertificates() {
  const { seasons, tournaments, matches, players, batting, bowling } = useData();
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [seasonId, setSeasonId] = useState('');
  const [type, setType] = useState<CertType>('winner_team');
  const [recipient, setRecipient] = useState('');
  const [matchId, setMatchId] = useState('');
  const [template, setTemplate] = useState<CertTemplate>('classic');
  const [renderProvider, setRenderProvider] = useState<'internal_pdf' | 'canva'>('internal_pdf');
  const [canvaTemplateId, setCanvaTemplateId] = useState('');
  const [preview, setPreview] = useState<CertificateRecord | null>(null);
  
  const { toast } = useToast();
  const [lastMailDispatch, setLastMailDispatch] = useState<{ total: number; delivered: number; failed: number } | null>(null);

  const refresh = async () => {
    const data = await v2api.getCertificates();
    setCertificates(data.map(withResolvedCertificateSecurity).sort((a, b) => (b.generated_at || '').localeCompare(a.generated_at || '')));
  };

  useEffect(() => {
    refresh();
  }, []);

  const selectedSeason = useMemo(() => seasons.find((s) => s.season_id === seasonId), [seasons, seasonId]);
  const seasonMatches = useMemo(() => matches.filter((m) => m.season_id === seasonId), [matches, seasonId]);

  const suggestedRecipients = useMemo(() => {
    if (!selectedSeason) return [];
    if (type === 'winner_team') return [selectedSeason.winner_team || ''].filter(Boolean);
    if (type === 'runner_up_team') return [selectedSeason.runner_up_team || ''].filter(Boolean);
    if (type === 'man_of_match') {
      return Array.from(
        new Set(
          seasonMatches
            .map((m) => resolvePlayerFromIdentity(m.man_of_match, players)?.name || '')
            .filter(Boolean),
        ),
      );
    }

    const runs = new Map<string, number>();
    const wickets = new Map<string, number>();
    seasonMatches.forEach((m) => {
      batting.filter((b) => b.match_id === m.match_id).forEach((b) => runs.set(b.player_id, (runs.get(b.player_id) || 0) + b.runs));
      bowling.filter((b) => b.match_id === m.match_id).forEach((b) => wickets.set(b.player_id, (wickets.get(b.player_id) || 0) + b.wickets));
    });
    const runLeader = [...runs.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const wicketLeader = [...wickets.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (type === 'man_of_tournament_runs') return [players.find((p) => p.player_id === runLeader)?.name || ''].filter(Boolean);
    if (type === 'man_of_tournament_wickets') return [players.find((p) => p.player_id === wicketLeader)?.name || ''].filter(Boolean);
    return [players.find((p) => p.player_id === runLeader)?.name, players.find((p) => p.player_id === wicketLeader)?.name].filter(Boolean) as string[];
  }, [selectedSeason, type, seasonMatches, players, batting, bowling]);

  const selectedTournament = useMemo(
    () => tournaments.find((t) => t.tournament_id === selectedSeason?.tournament_id),
    [selectedSeason?.tournament_id, tournaments],
  );
  const awardCategoryLabel = useMemo(() => {
    if (type === 'winner_team' || type === 'runner_up_team') {
      return `${selectedTournament?.name || 'Tournament'} • ${selectedSeason?.year || 'Season'}`;
    }
    if (type === 'man_of_match' && matchId) {
      const match = seasonMatches.find((m) => m.match_id === matchId);
      return match ? `${match.team_a} vs ${match.team_b}` : 'Match category';
    }
    return selectedTournament?.name || 'Performance category';
  }, [matchId, seasonMatches, selectedSeason?.year, selectedTournament?.name, type]);

  // Live preview certificate record (not saved, just for visual)
  const livePreviewCert = useMemo<CertificateRecord | null>(() => {
    if (!selectedSeason) return null;
    return {
      certificate_id: 'LIVE-PREVIEW',
      certificate_template: template,
      certificate_type: type,
      title: certCatalog.find((c) => c.value === type)?.label || 'Certificate',
      season_id: selectedSeason.season_id,
      tournament_id: selectedSeason.tournament_id,
      match_id: matchId,
      recipient_type: type.includes('team') ? 'team' : 'player',
      recipient_id: '',
      recipient_name: recipient || '[Recipient Name]',
      metadata_json: JSON.stringify({ seasonYear: selectedSeason.year, tournament: selectedTournament?.name || '', awardCategory: awardCategoryLabel }),
      certificate_html: '',
      qr_payload: 'https://example.com/verify-certificate/LIVE-PREVIEW',
      verification_url: 'https://example.com/verify-certificate/LIVE-PREVIEW',
      verification_token: 'preview-token',
      security_hash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      tamper_evident_payload: '',
      approval_status: 'pending_approval',
      approvals_json: JSON.stringify({ Treasurer: false, 'Scoring Official': false, 'Match Referee': false }),
      signatures_json: '[]',
      generated_by: 'admin',
      generated_at: new Date().toISOString(),
      approved_at: '',
      delivery_status: 'not_sent',
      render_provider: renderProvider,
      render_status: 'not_requested',
      canva_template_id: canvaTemplateId.trim(),
      canva_export_url: '',
      canva_job_id: '',
      render_error: '',
      rendered_at: '',
    };
  }, [selectedSeason, template, type, matchId, recipient, selectedTournament?.name, awardCategoryLabel, renderProvider, canvaTemplateId]);

  const generateCertificate = async () => {
    if (!selectedSeason || !recipient.trim()) {
      toast({ title: 'Select season and recipient', variant: 'destructive' });
      return;
    }
    if (type === 'man_of_match' && !matchId) {
      toast({ title: 'Match required for Man of the Match', description: 'Select a match so certificate data stays accurate.', variant: 'destructive' });
      return;
    }
    if (renderProvider === 'canva' && !canvaTemplateId.trim()) {
      toast({ title: 'Canva template required', description: 'Provide a Canva template ID before generating.', variant: 'destructive' });
      return;
    }
    const tournament = tournaments.find((t) => t.tournament_id === selectedSeason.tournament_id);
    const approvals: ApprovalMap = { Treasurer: false, 'Scoring Official': false, 'Match Referee': false };
    const title = certCatalog.find((c) => c.value === type)?.label || 'Certificate';
    const certificateId = generateId('CERT');
    const verificationToken = createVerificationToken();
    const generatedAt = istNow();
    const verificationUrl = buildCertificateVerificationUrl(certificateId, verificationToken);
    const qrPayload = verificationUrl;
    const recipientId = players.find((p) => p.name === recipient)?.player_id || recipient.trim();
    const tamperEvidentPayload = buildCertificateTamperEvidentPayload({
      certificate_id: certificateId,
      certificate_type: type,
      recipient_id: recipientId,
      recipient_name: recipient.trim(),
      season_id: selectedSeason.season_id,
      tournament_id: selectedSeason.tournament_id,
      match_id: matchId || '',
      generated_at: generatedAt,
      verification_token: verificationToken,
    });
    const securityHash = await createCertificateDigest({
      certificate_id: certificateId,
      certificate_type: type,
      recipient_id: recipientId,
      recipient_name: recipient.trim(),
      season_id: selectedSeason.season_id,
      tournament_id: selectedSeason.tournament_id,
      match_id: matchId || '',
      generated_at: generatedAt,
      verification_token: verificationToken,
    });

    const certificate: CertificateRecord = {
      certificate_id: certificateId,
      certificate_template: template,
      certificate_type: type,
      title,
      season_id: selectedSeason.season_id,
      tournament_id: selectedSeason.tournament_id,
      match_id: matchId,
      recipient_type: type.includes('team') ? 'team' : 'player',
      recipient_id: recipientId,
      recipient_name: recipient.trim(),
      metadata_json: JSON.stringify({
        seasonYear: selectedSeason.year,
        tournament: tournament?.name || '',
        winnerTeam: selectedSeason.winner_team || '',
        runnerUpTeam: selectedSeason.runner_up_team || '',
        awardCategory: awardCategoryLabel,
        generatedForMatch: matchId || '',
      }),
      certificate_html: `<section><h2>${title}</h2><p>${recipient.trim()}</p><p>${selectedSeason.year}</p><p>Template: ${template}</p></section>`,
      qr_payload: qrPayload,
      verification_url: verificationUrl,
      verification_token: verificationToken,
      security_hash: securityHash,
      tamper_evident_payload: tamperEvidentPayload,
      approval_status: 'pending_approval',
      approvals_json: JSON.stringify(approvals),
      signatures_json: JSON.stringify([]),
      generated_by: 'admin',
      generated_at: generatedAt,
      approved_at: '',
      delivery_status: 'not_sent',
      render_provider: renderProvider,
      render_status: 'not_requested',
      canva_template_id: canvaTemplateId.trim(),
      canva_export_url: '',
      canva_job_id: '',
      render_error: '',
      rendered_at: '',
    };
    const normalizedCertificate = withResolvedCertificateSecurity(certificate);
    const ok = await v2api.addCertificate(normalizedCertificate);
    if (!ok) {
      toast({ title: 'Certificate save failed', description: 'Ensure CERTIFICATES tab exists.', variant: 'destructive' });
      return;
    }
    logAudit('admin', 'certificate_generate', 'certificate', normalizedCertificate.certificate_id, JSON.stringify({ type, seasonId, recipient, template }));
    const management = await v2api.getManagementUsers();
    const requiredRoles = ['Treasurer', 'Scoring Official', 'Match Referee'];
    const mailTargets = management.filter((member) => requiredRoles.includes(String(member.designation || '')) && !!String(member.email || '').trim());
    const mailDispatch = await Promise.all(mailTargets.map((member) => sendSystemEmail({
      to: String(member.email || ''),
      subject: `Certificate approval required: ${normalizedCertificate.certificate_id}`,
      htmlBody: `<p>Dear ${member.name || member.designation},</p><p>A certificate is waiting for your approval signature.</p><p><strong>Certificate ID:</strong> ${normalizedCertificate.certificate_id}<br/><strong>Recipient:</strong> ${normalizedCertificate.recipient_name}<br/><strong>Type:</strong> ${normalizedCertificate.title}</p><p>Please sign in to Management and approve it.</p>`,
      diagnostics: {
        triggerSource: 'certificate_approval_request',
        triggerEntityType: 'certificate',
        triggerEntityId: normalizedCertificate.certificate_id,
        triggeredBy: 'admin',
      },
    })));
    const delivered = mailDispatch.filter((entry) => entry.success).length;
    const failed = mailDispatch.length - delivered;
    setLastMailDispatch({ total: mailDispatch.length, delivered, failed });
    toast({
      title: failed > 0 ? 'Certificate generated with mail warnings' : 'Certificate generated',
      description: failed > 0
        ? `Approval workflow created. ${delivered}/${mailDispatch.length} emails delivered.`
        : `Sent ${delivered} approval request email(s).`,
      variant: failed > 0 ? 'destructive' : 'default',
    });
    setPreview(normalizedCertificate);
    if (renderProvider === 'canva') {
      const job = await queueCanvaCertificateRender(normalizedCertificate, 'admin');
      const queuedCertificate: CertificateRecord = {
        ...normalizedCertificate,
        canva_job_id: job.job_id,
        render_status: 'queued',
      };
      await v2api.updateCertificate(queuedCertificate);
      toast({
        title: 'Canva render queued',
        description: `Template ${queuedCertificate.canva_template_id} queued for ${queuedCertificate.recipient_name}.`,
      });
      setPreview(queuedCertificate);
    }
    refresh();
  };

  const triggerCanvaRender = async (item: CertificateRecord) => {
    if (!item.canva_template_id) {
      toast({ title: 'Missing Canva template ID', variant: 'destructive' });
      return;
    }
    const job = await queueCanvaCertificateRender(item, 'admin');
    const updated: CertificateRecord = {
      ...item,
      canva_job_id: job.job_id,
      render_provider: 'canva',
      render_status: 'queued',
      render_error: '',
    };
    await v2api.updateCertificate(updated);
    await refresh();
  };

  const syncCanvaStatus = async (item: CertificateRecord) => {
    if (!item.canva_job_id) {
      toast({ title: 'No Canva job linked', description: 'Queue a render first.', variant: 'destructive' });
      return;
    }
    const job = await pollCanvaCertificateRender(item.canva_job_id);
    if (!job) {
      toast({ title: 'Canva job not found', variant: 'destructive' });
      return;
    }
    const updated: CertificateRecord = {
      ...item,
      render_provider: 'canva',
      render_status: job.status,
      canva_export_url: job.export_url,
      render_error: job.error,
      rendered_at: job.completed_at || item.rendered_at,
    };
    await v2api.updateCertificate(updated);
    setPreview(updated);
    await refresh();
  };

  const toggleApproval = async (item: CertificateRecord, role: keyof ApprovalMap) => {
    const parsed = (item.approvals_json ? JSON.parse(item.approvals_json) : {}) as ApprovalMap;
    const updated = { ...parsed, [role]: !parsed[role] };
    const signatures: SignatureEntry[] = item.signatures_json ? JSON.parse(item.signatures_json) : [];
    const nextSignatures = updated[role]
      ? [...signatures.filter((entry) => entry.role !== role), { role, signerId: 'admin', signerName: role, signedAt: istNow() }]
      : signatures.filter((entry) => entry.role !== role);
    const fullyApproved = Object.values(updated).every(Boolean);
    const payload: CertificateRecord = withResolvedCertificateSecurity({
      ...item,
      approvals_json: JSON.stringify(updated),
      signatures_json: JSON.stringify(nextSignatures),
      approval_status: fullyApproved ? 'approved' : 'pending_approval',
      approved_at: fullyApproved ? istNow() : '',
    });
    await v2api.updateCertificate(payload);
    logAudit('admin', 'certificate_signature_update', 'certificate', item.certificate_id, JSON.stringify({ role, approved: updated[role] }));
    refresh();
  };

  return (
    <div className="space-y-4">
      <Card className="mandala-sports-bg border-primary/30">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><Trophy className="h-5 w-5" /> Special Presentation Certificates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-6">
            <div><Label>Season</Label><Select value={seasonId} onValueChange={setSeasonId}><SelectTrigger><SelectValue placeholder="Select season" /></SelectTrigger><SelectContent>{seasons.map((s) => <SelectItem key={s.season_id} value={s.season_id}>{s.year} • {s.season_id}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Certificate Type</Label><Select value={type} onValueChange={(v) => setType(v as CertType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{certCatalog.map((c) => <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Template</Label><Select value={template} onValueChange={(v) => setTemplate(v as CertTemplate)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{templateCatalog.map((t) => <SelectItem key={t.value} value={t.value}><span className="inline-flex items-center gap-2"><PaintBucket className="h-3 w-3" /> {t.label}</span></SelectItem>)}</SelectContent></Select></div>
            <div><Label>Render via</Label><Select value={renderProvider} onValueChange={(v) => setRenderProvider(v as 'internal_pdf' | 'canva')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="internal_pdf">Internal PDF</SelectItem><SelectItem value="canva">Canva Template</SelectItem></SelectContent></Select></div>
            <div><Label>Recipient</Label><Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder={suggestedRecipients[0] || 'Name / team'} /></div>
            <div><Label>Match (for MOM)</Label><Select value={matchId} onValueChange={setMatchId}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent>{seasonMatches.map((m) => <SelectItem key={m.match_id} value={m.match_id}>{m.match_id}: {m.team_a} vs {m.team_b}</SelectItem>)}</SelectContent></Select></div>
          </div>
          {renderProvider === 'canva' && (
            <div><Label>Canva Template ID</Label><Input value={canvaTemplateId} onChange={(e) => setCanvaTemplateId(e.target.value)} placeholder="e.g. DAFx12345ABCDE" /></div>
          )}
          <div className="flex flex-wrap gap-2">
            {suggestedRecipients.slice(0, 4).map((name) => <Button key={name} variant="outline" size="sm" onClick={() => setRecipient(name)}>{name}</Button>)}
          </div>
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-xl border border-primary/15 bg-card p-3 shadow-sm">
              <p className="mb-3 text-sm font-medium text-foreground">Live certificate artboard preview</p>
              {livePreviewCert ? (
                <CertificateArtboard certificate={livePreviewCert} compact />
              ) : (
                <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">Select a season to preview</div>
              )}
            </div>
            <div className="rounded-xl border border-primary/15 bg-gradient-to-b from-card to-muted/40 p-4 text-xs text-muted-foreground shadow-sm">
              <p className="font-semibold text-foreground">Certificate reliability status</p>
              <p className="mt-2">The QR and verification link point to a public verify route.</p>
              <p className="mt-1">Security uses SHA-256 digest over a tamper-evident canonical payload.</p>
              <p className="mt-1">Pending certificates are watermarked in preview/PDF until fully approved.</p>
              <p className="mt-1">Approvals require Treasurer, Scoring Official, and Match Referee signatures.</p>
              <p className="mt-1">Canva mode queues a render job and stores export link after status sync.</p>
              {lastMailDispatch && (
                <p className="mt-1">
                  Latest email dispatch: {lastMailDispatch.delivered}/{lastMailDispatch.total} delivered
                  {lastMailDispatch.failed > 0 ? ` (${lastMailDispatch.failed} failed)` : ''}.
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={generateCertificate}><Medal className="mr-1 h-4 w-4" /> Generate & Send for Approval</Button>
            {preview && <Button variant="secondary" onClick={() => downloadCertificatePdf(preview)}><Download className="mr-1 h-4 w-4" /> Download Preview</Button>}
          </div>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Eye className="h-4 w-4" /> Certificate Preview</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <CertificateArtboard certificate={preview} />
            <div className="flex items-center justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => previewCertificatePdf(preview)}><FileText className="mr-1 h-3 w-3" /> Preview PDF</Button>
              <Button size="sm" onClick={() => downloadCertificatePdf(preview)}><Download className="mr-1 h-3 w-3" /> Download PDF</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-4 w-4" /> Certificate Workflow Queue</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {certificates.map((item) => {
            const approvals = (item.approvals_json ? JSON.parse(item.approvals_json) : {}) as ApprovalMap;
            return (
              <div key={item.certificate_id} className="rounded-xl border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><p className="font-semibold">{item.title} • {item.recipient_name}</p><p className="text-xs text-muted-foreground">{item.certificate_id}</p></div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.approval_status === 'approved' ? 'default' : 'secondary'}>{item.approval_status}</Badge>
                    {item.render_provider === 'canva' && <Badge variant="outline">Canva: {item.render_status || 'not_requested'}</Badge>}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(Object.keys({ Treasurer: true, 'Scoring Official': true, 'Match Referee': true }) as (keyof ApprovalMap)[]).map((role) => (
                    <Button key={role} size="sm" variant={approvals[role] ? 'default' : 'outline'} onClick={() => toggleApproval(item, role)}>
                      <ShieldCheck className="mr-1 h-3 w-3" /> {role}
                    </Button>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => { setPreview(item); }}>{'Preview'}</Button>
                  <Button size="sm" variant="outline" onClick={() => previewCertificatePdf(item)}>Preview PDF</Button>
                  <Button size="sm" variant="outline" onClick={() => downloadCertificatePdf(item)}>Download PDF</Button>
                  {item.render_provider === 'canva' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => syncCanvaStatus(item)}>Sync Canva Status</Button>
                      {!item.canva_job_id && <Button size="sm" variant="outline" onClick={() => triggerCanvaRender(item)}>Queue Canva Render</Button>}
                      {item.canva_export_url && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => window.open(item.canva_export_url, '_blank', 'noopener,noreferrer')}
                        >
                          Open Canva Export
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {certificates.length === 0 && <p className="text-sm text-muted-foreground">No certificates generated yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

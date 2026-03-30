import { useEffect, useMemo, useRef, useState } from 'react';
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
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Trophy, Medal, Award, Download, Eye, FileText, PaintBucket } from 'lucide-react';
import { downloadCertificatePdf, previewCertificatePdf } from '@/lib/certificatePdf';
import { resolvePlayerFromIdentity } from '@/lib/dataUtils';
import { sendSystemEmail } from '@/lib/mailer';

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
];

export function AdminCertificates() {
  const { seasons, tournaments, matches, players, batting, bowling } = useData();
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [seasonId, setSeasonId] = useState('');
  const [type, setType] = useState<CertType>('winner_team');
  const [recipient, setRecipient] = useState('');
  const [matchId, setMatchId] = useState('');
  const [template, setTemplate] = useState<CertTemplate>('classic');
  const [preview, setPreview] = useState<CertificateRecord | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const { toast } = useToast();
  const [lastMailDispatch, setLastMailDispatch] = useState<{ total: number; delivered: number; failed: number } | null>(null);

  const refresh = async () => {
    const data = await v2api.getCertificates();
    setCertificates(data.sort((a, b) => (b.generated_at || '').localeCompare(a.generated_at || '')));
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

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const palette = templateCatalog.find((item) => item.value === template) || templateCatalog[0];

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, palette.bg);
    ctx.fillStyle = gradient;
    ctx.fillRect(20, 20, canvas.width - 40, canvas.height - 40);
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 3.5;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(44, 44, canvas.width - 88, canvas.height - 88);
    ctx.strokeRect(54, 54, canvas.width - 108, canvas.height - 108);
    ctx.fillStyle = palette.heading;
    ctx.fillRect(54, 54, canvas.width - 108, 44);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = '600 18px serif';
    ctx.fillText('CRICKET CLUB HONORS BOARD', canvas.width / 2, 82);
    ctx.fillStyle = palette.heading;
    ctx.font = '700 42px serif';
    ctx.fillText('CERTIFICATE', canvas.width / 2, 156);
    ctx.font = '700 21px serif';
    ctx.fillText('OF EXCELLENCE', canvas.width / 2, 188);
    ctx.font = '500 17px sans-serif';
    ctx.fillText('This is proudly presented to', canvas.width / 2, 220);
    ctx.font = 'italic 700 40px serif';
    ctx.fillText(recipient || '[Recipient Full Name]', canvas.width / 2, 254);
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(130, 264);
    ctx.lineTo(canvas.width - 130, 264);
    ctx.stroke();
    ctx.font = '600 17px sans-serif';
    ctx.fillText('For exceptional cricketing contribution in', canvas.width / 2, 292);
    ctx.font = '700 26px sans-serif';
    ctx.fillText((selectedTournament?.name || '[CRICKET TOURNAMENT NAME]').toUpperCase(), canvas.width / 2, 323);
    ctx.font = '700 22px sans-serif';
    ctx.fillStyle = palette.border;
    ctx.fillText(`[${type === 'winner_team' ? 'WINNER' : type === 'runner_up_team' ? 'RUNNER-UP' : 'SPECIAL AWARD'}]`, canvas.width / 2, 354);
    ctx.fillStyle = '#111827';
    ctx.font = '600 16px sans-serif';
    ctx.fillText(`Award Category: ${awardCategoryLabel}`, canvas.width / 2, 380);
    ctx.fillText(`Awarded Entity: ${type.includes('team') ? (recipient || 'Team') : recipient || 'Player'}`, canvas.width / 2, 402);
    ctx.fillText(`Date: ${new Date().toLocaleDateString('en-GB')}    Season: ${selectedSeason?.year || 'N/A'}`, canvas.width / 2, 424);

    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Certificate ID: LIVE-PREVIEW`, 70, 448);
    ctx.fillText(`Template: ${palette.label}`, 70, 468);
    ctx.fillText(`Verification via QR + signed approvals`, 70, 488);

    ctx.textAlign = 'center';
    ctx.font = '12px sans-serif';
    ctx.fillText('SIGNATURE 1', canvas.width * 0.24, 468);
    ctx.fillText('SIGNATURE 2', canvas.width * 0.5, 468);
    ctx.fillText('SIGNATURE 3', canvas.width * 0.76, 468);
    ctx.strokeStyle = '#6b7280';
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.14, 452);
    ctx.lineTo(canvas.width * 0.34, 452);
    ctx.moveTo(canvas.width * 0.4, 452);
    ctx.lineTo(canvas.width * 0.6, 452);
    ctx.moveTo(canvas.width * 0.66, 452);
    ctx.lineTo(canvas.width * 0.86, 452);
    ctx.stroke();

    ctx.globalAlpha = 0.12;
    ctx.fillStyle = palette.border;
    ctx.font = 'bold 56px serif';
    ctx.fillText('LIVE PREVIEW', canvas.width / 2, canvas.height / 2 + 32);
    ctx.globalAlpha = 1;
  }, [awardCategoryLabel, recipient, selectedSeason?.winner_team, selectedSeason?.year, selectedTournament?.name, template, type]);

  const generateCertificate = async () => {
    if (!selectedSeason || !recipient.trim()) {
      toast({ title: 'Select season and recipient', variant: 'destructive' });
      return;
    }
    if (type === 'man_of_match' && !matchId) {
      toast({ title: 'Match required for Man of the Match', description: 'Select a match so certificate data stays accurate.', variant: 'destructive' });
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
    const tamperEvidentPayload = JSON.stringify({
      certificate_id: certificateId,
      certificate_type: type,
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
      recipient_id: players.find((p) => p.name === recipient)?.player_id || recipient,
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
      recipient_id: players.find((p) => p.name === recipient)?.player_id || recipient,
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
    };
    const ok = await v2api.addCertificate(certificate);
    if (!ok) {
      toast({ title: 'Certificate save failed', description: 'Ensure CERTIFICATES tab exists.', variant: 'destructive' });
      return;
    }
    logAudit('admin', 'certificate_generate', 'certificate', certificate.certificate_id, JSON.stringify({ type, seasonId, recipient, template }));
    const management = await v2api.getManagementUsers();
    const requiredRoles = ['Treasurer', 'Scoring Official', 'Match Referee'];
    const mailTargets = management.filter((member) => requiredRoles.includes(String(member.designation || '')) && !!String(member.email || '').trim());
    const mailDispatch = await Promise.all(mailTargets.map((member) => sendSystemEmail({
      to: String(member.email || ''),
      subject: `Certificate approval required: ${certificate.certificate_id}`,
      htmlBody: `<p>Dear ${member.name || member.designation},</p><p>A certificate is waiting for your approval signature.</p><p><strong>Certificate ID:</strong> ${certificate.certificate_id}<br/><strong>Recipient:</strong> ${certificate.recipient_name}<br/><strong>Type:</strong> ${certificate.title}</p><p>Please sign in to Management and approve it.</p>`,
      diagnostics: {
        triggerSource: 'certificate_approval_request',
        triggerEntityType: 'certificate',
        triggerEntityId: certificate.certificate_id,
        triggeredBy: 'admin',
      },
    })));
    const delivered = mailDispatch.filter((entry) => entry.ok).length;
    const failed = mailDispatch.length - delivered;
    setLastMailDispatch({ total: mailDispatch.length, delivered, failed });
    toast({
      title: failed > 0 ? 'Certificate generated with mail warnings' : 'Certificate generated',
      description: failed > 0
        ? `Approval workflow created. ${delivered}/${mailDispatch.length} emails delivered.`
        : `Sent ${delivered} approval request email(s).`,
      variant: failed > 0 ? 'destructive' : 'default',
    });
    setPreview(certificate);
    refresh();
  };

  const toggleApproval = async (item: CertificateRecord, role: keyof ApprovalMap) => {
    const parsed = (item.approvals_json ? JSON.parse(item.approvals_json) : {}) as ApprovalMap;
    const updated = { ...parsed, [role]: !parsed[role] };
    const signatures: SignatureEntry[] = item.signatures_json ? JSON.parse(item.signatures_json) : [];
    const nextSignatures = updated[role]
      ? [...signatures.filter((entry) => entry.role !== role), { role, signerId: 'admin', signerName: role, signedAt: istNow() }]
      : signatures.filter((entry) => entry.role !== role);
    const fullyApproved = Object.values(updated).every(Boolean);
    const payload: CertificateRecord = {
      ...item,
      approvals_json: JSON.stringify(updated),
      signatures_json: JSON.stringify(nextSignatures),
      approval_status: fullyApproved ? 'approved' : 'pending_approval',
      approved_at: fullyApproved ? istNow() : '',
    };
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
          <div className="grid gap-3 md:grid-cols-5">
            <div><Label>Season</Label><Select value={seasonId} onValueChange={setSeasonId}><SelectTrigger><SelectValue placeholder="Select season" /></SelectTrigger><SelectContent>{seasons.map((s) => <SelectItem key={s.season_id} value={s.season_id}>{s.year} • {s.season_id}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Certificate Type</Label><Select value={type} onValueChange={(v) => setType(v as CertType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{certCatalog.map((c) => <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Template</Label><Select value={template} onValueChange={(v) => setTemplate(v as CertTemplate)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{templateCatalog.map((t) => <SelectItem key={t.value} value={t.value}><span className="inline-flex items-center gap-2"><PaintBucket className="h-3 w-3" /> {t.label}</span></SelectItem>)}</SelectContent></Select></div>
            <div><Label>Recipient</Label><Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder={suggestedRecipients[0] || 'Name / team'} /></div>
            <div><Label>Match (for MOM)</Label><Select value={matchId} onValueChange={setMatchId}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent>{seasonMatches.map((m) => <SelectItem key={m.match_id} value={m.match_id}>{m.match_id}: {m.team_a} vs {m.team_b}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedRecipients.slice(0, 4).map((name) => <Button key={name} variant="outline" size="sm" onClick={() => setRecipient(name)}>{name}</Button>)}
          </div>
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-xl border bg-white/50 p-3">
              <p className="mb-2 text-sm font-medium">Live certificate canvas preview</p>
              <canvas ref={previewCanvasRef} width={760} height={470} className="w-full rounded-lg border border-primary/10 bg-white" />
            </div>
            <div className="rounded-xl border bg-background p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Certificate reliability status</p>
              <p className="mt-2">The QR and verification link point to a public verify route.</p>
              <p className="mt-1">Security uses SHA-256 digest over a tamper-evident canonical payload.</p>
              <p className="mt-1">Pending certificates are watermarked in preview/PDF until fully approved.</p>
              <p className="mt-1">Approvals require Treasurer, Scoring Official, and Match Referee signatures.</p>
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
          <CardContent className="space-y-3">
            <div className="mandala-sports-bg rounded-2xl border border-primary/20 p-6 text-center relative">
              {preview.approval_status !== 'approved' && <div className="pointer-events-none absolute inset-0 grid place-items-center text-5xl font-black tracking-wider text-amber-700/20">PENDING</div>}
              <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white/80 px-4 py-1 text-xs font-semibold">{certCatalog.find((c) => c.value === preview.certificate_type)?.icon} Verified Presentation Card</div>
              <h3 className="font-display text-2xl uppercase tracking-wide">{preview.title}</h3>
              <p className="mt-2 text-lg font-semibold">{preview.recipient_name}</p>
              <p className="text-sm text-muted-foreground">Designation signatures only after approval: Treasurer • Scoring Official • Match Referee</p>
              <div className="mt-4 flex items-center justify-center gap-4">
                <QRCodeSVG value={preview.verification_url || preview.qr_payload} size={90} />
                <p className="max-w-xs text-left text-xs">Scan QR to verify authenticity. Security Hash: <span className="font-mono break-all">{preview.security_hash}</span></p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground break-all">Verify URL: {preview.verification_url || preview.qr_payload}</p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button size="sm" variant="outline" onClick={() => previewCertificatePdf(preview)}><FileText className="mr-1 h-3 w-3" /> Preview PDF</Button>
                <Button size="sm" onClick={() => downloadCertificatePdf(preview)}><Download className="mr-1 h-3 w-3" /> Download PDF</Button>
              </div>
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
                  <Badge variant={item.approval_status === 'approved' ? 'default' : 'secondary'}>{item.approval_status}</Badge>
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

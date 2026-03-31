import { useMemo } from 'react';
import { CertificateRecord } from '@/lib/v2types';
import { QRCodeSVG } from 'qrcode.react';
import { formatInIST } from '@/lib/time';
import { Shield, CheckCircle2, Clock, XCircle, Award, Star } from 'lucide-react';

type ApprovalMap = Record<'Treasurer' | 'Scoring Official' | 'Match Referee', boolean>;
type SignatureEntry = { role: string; signerName: string; signedAt: string };

const THEMES = {
  classic: {
    outer: 'from-amber-50 via-orange-50/40 to-amber-50',
    headerBg: 'bg-gradient-to-r from-[hsl(220,45%,22%)] to-[hsl(220,40%,30%)]',
    border: 'border-amber-700/50',
    innerBorder: 'border-amber-600/30',
    accent: 'text-amber-700',
    accentBg: 'bg-amber-700/10',
    ornament: 'text-amber-600/40',
    ribbon: 'bg-amber-700',
    sealRing: 'border-amber-700',
    sealBg: 'bg-amber-50',
  },
  premium: {
    outer: 'from-blue-50 via-indigo-50/30 to-blue-50',
    headerBg: 'bg-gradient-to-r from-[hsl(220,55%,20%)] to-[hsl(230,50%,30%)]',
    border: 'border-blue-700/50',
    innerBorder: 'border-blue-500/25',
    accent: 'text-blue-700',
    accentBg: 'bg-blue-700/10',
    ornament: 'text-blue-500/30',
    ribbon: 'bg-blue-700',
    sealRing: 'border-blue-700',
    sealBg: 'bg-blue-50',
  },
  gold: {
    outer: 'from-yellow-50 via-amber-50/40 to-yellow-50',
    headerBg: 'bg-gradient-to-r from-[hsl(35,50%,18%)] to-[hsl(35,45%,28%)]',
    border: 'border-yellow-700/50',
    innerBorder: 'border-yellow-600/25',
    accent: 'text-yellow-700',
    accentBg: 'bg-yellow-700/10',
    ornament: 'text-yellow-600/30',
    ribbon: 'bg-yellow-700',
    sealRing: 'border-yellow-700',
    sealBg: 'bg-yellow-50',
  },
};

const CERT_LABELS: Record<string, string> = {
  winner_team: 'TOURNAMENT WINNER',
  runner_up_team: 'TOURNAMENT RUNNER-UP',
  man_of_match: 'MAN OF THE MATCH',
  man_of_tournament_runs: 'BEST BATSMAN',
  man_of_tournament_wickets: 'BEST BOWLER',
  man_of_tournament_all_round: 'OUTSTANDING ALL-ROUNDER',
};

interface Props {
  certificate: CertificateRecord;
  compact?: boolean;
}

export default function CertificateArtboard({ certificate: cert, compact = false }: Props) {
  const theme = THEMES[cert.certificate_template as keyof typeof THEMES] || THEMES.classic;
  const awardLabel = CERT_LABELS[cert.certificate_type] || 'CERTIFICATE OF EXCELLENCE';

  const metadata = useMemo(() => {
    try { return cert.metadata_json ? JSON.parse(cert.metadata_json) : {}; } catch { return {}; }
  }, [cert.metadata_json]);

  const approvals = useMemo<ApprovalMap>(() => {
    try { return cert.approvals_json ? JSON.parse(cert.approvals_json) : {}; } catch { return {} as ApprovalMap; }
  }, [cert.approvals_json]);

  const signatures = useMemo<SignatureEntry[]>(() => {
    try { return cert.signatures_json ? JSON.parse(cert.signatures_json) : []; } catch { return []; }
  }, [cert.signatures_json]);

  const isApproved = cert.approval_status === 'approved';
  const isRevoked = cert.approval_status === 'revoked';
  const isPending = !isApproved && !isRevoked;
  const verifyUrl = cert.verification_url || cert.qr_payload || '';
  const tournamentName = metadata.tournament || cert.tournament_id || 'Tournament';
  const seasonYear = metadata.seasonYear || cert.season_id || '';

  const CornerOrnament = ({ className }: { className?: string }) => (
    <div className={`absolute w-10 h-10 ${className}`}>
      <svg viewBox="0 0 40 40" fill="none" className={`w-full h-full ${theme.ornament}`}>
        <path d="M0 0 L40 0 L40 6 L6 6 L6 40 L0 40 Z" fill="currentColor" />
        <path d="M10 10 L30 10 L30 13 L13 13 L13 30 L10 30 Z" fill="currentColor" opacity="0.5" />
        <circle cx="16" cy="16" r="2" fill="currentColor" opacity="0.7" />
      </svg>
    </div>
  );

  return (
    <div className={`relative select-none ${compact ? 'text-[0.85em]' : ''}`}>
      {/* Outer frame */}
      <div className={`relative overflow-hidden rounded-lg border-[3px] ${theme.border} bg-gradient-to-br ${theme.outer} shadow-2xl`}>
        {/* Inner border */}
        <div className={`m-2 rounded border-[1.5px] ${theme.innerBorder}`}>
          {/* Dotted inner border */}
          <div className={`m-1.5 rounded border border-dashed ${theme.innerBorder}`}>

            {/* Corner ornaments */}
            <CornerOrnament className="top-1 left-1" />
            <CornerOrnament className="top-1 right-1 -scale-x-100" />
            <CornerOrnament className="bottom-1 left-1 -scale-y-100" />
            <CornerOrnament className="bottom-1 right-1 -scale-x-100 -scale-y-100" />

            {/* Security watermark (semi-visible) */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-30 whitespace-nowrap font-display text-6xl font-bold tracking-[0.2em] text-foreground/[0.03]">
                VERIFIED RECORD
              </div>
            </div>

            {/* Status watermark for pending/revoked */}
            {(isPending || isRevoked) && (
              <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center" aria-hidden="true">
                <div className={`-rotate-12 rounded-xl border-4 px-8 py-3 font-display text-4xl font-bold tracking-[0.25em] ${isRevoked ? 'border-destructive/40 text-destructive/30' : 'border-accent/40 text-accent/30'}`}>
                  {isRevoked ? 'REVOKED' : 'PENDING'}
                </div>
              </div>
            )}

            {/* Header ribbon */}
            <div className={`relative ${theme.headerBg} px-6 py-3 text-center`}>
              <div className="flex items-center justify-center gap-2">
                <Star className="h-3.5 w-3.5 text-amber-300" />
                <span className="font-display text-sm font-semibold tracking-[0.35em] text-amber-100 uppercase">
                  Cricket Club Honors Board
                </span>
                <Star className="h-3.5 w-3.5 text-amber-300" />
              </div>
            </div>

            {/* Main body */}
            <div className={`relative ${compact ? 'px-5 py-4' : 'px-8 py-6'}`}>

              {/* Title section */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-3">
                  <div className={`h-px flex-1 max-w-16 ${theme.ribbon}`} />
                  <span className={`text-[10px] font-semibold tracking-[0.4em] uppercase ${theme.accent}`}>★ ★ ★</span>
                  <div className={`h-px flex-1 max-w-16 ${theme.ribbon}`} />
                </div>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-[0.08em] text-foreground uppercase">
                  Certificate of Excellence
                </h2>
                <div className={`mx-auto mt-1 h-0.5 w-48 bg-gradient-to-r from-transparent ${theme.ribbon} to-transparent`} />
                <p className="mt-3 text-xs tracking-[0.2em] text-muted-foreground uppercase">
                  This certificate is proudly presented to
                </p>
              </div>

              {/* Recipient */}
              <div className="mt-4 text-center">
                <p className={`font-display ${compact ? 'text-3xl' : 'text-4xl'} font-bold tracking-wide text-primary`}>
                  {cert.recipient_name}
                </p>
                <div className={`mx-auto mt-1 h-px w-64 bg-gradient-to-r from-transparent via-accent/60 to-transparent`} />
              </div>

              {/* Award & Tournament */}
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  For exceptional performance in <span className="font-semibold text-foreground">{tournamentName}</span>
                </p>
                <div className={`mt-2 inline-flex items-center gap-2 rounded-full border ${theme.innerBorder} ${theme.accentBg} px-4 py-1.5`}>
                  <Award className={`h-4 w-4 ${theme.accent}`} />
                  <span className={`font-display text-sm font-bold tracking-[0.12em] ${theme.accent} uppercase`}>
                    — {awardLabel} —
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium text-foreground">{cert.title}</p>
              </div>

              {/* Details grid */}
              <div className={`mt-5 grid gap-3 ${compact ? 'grid-cols-2' : 'sm:grid-cols-4'}`}>
                {[
                  { label: 'Tournament', value: tournamentName },
                  { label: 'Season', value: seasonYear },
                  { label: 'Issue Date', value: formatInIST(cert.generated_at) },
                  { label: 'Certificate ID', value: cert.certificate_id, mono: true },
                ].map((item) => (
                  <div key={item.label} className={`rounded-lg border ${theme.innerBorder} bg-white/60 px-3 py-2`}>
                    <p className="text-[9px] font-semibold tracking-[0.25em] text-muted-foreground uppercase">{item.label}</p>
                    <p className={`mt-0.5 text-xs font-medium text-foreground truncate ${item.mono ? 'font-mono text-[10px]' : ''}`}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Security & QR section */}
              <div className={`mt-5 grid gap-4 ${compact ? 'grid-cols-1' : 'lg:grid-cols-[1fr_auto_1fr]'} items-start`}>
                {/* Security info */}
                <div className={`rounded-lg border ${theme.innerBorder} bg-white/50 p-3`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Shield className={`h-3.5 w-3.5 ${theme.accent}`} />
                    <span className="text-[9px] font-bold tracking-[0.3em] text-muted-foreground uppercase">Security & Verification</span>
                  </div>
                  <div className="space-y-1.5">
                    <div>
                      <p className="text-[8px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">SHA-256 Hash</p>
                      <p className="font-mono text-[9px] text-foreground/80 break-all leading-tight">{cert.security_hash || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">Verification Token</p>
                      <p className="font-mono text-[9px] text-foreground/80 break-all leading-tight">{(cert.verification_token || 'N/A').substring(0, 32)}…</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">Approval Status</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase ${isApproved ? 'text-primary' : isRevoked ? 'text-destructive' : 'text-accent'}`}>
                        {isApproved ? <CheckCircle2 className="h-3 w-3" /> : isRevoked ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {cert.approval_status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center justify-center">
                  <div className={`rounded-xl border-2 ${theme.border} bg-white p-2.5 shadow-md`}>
                    <QRCodeSVG value={verifyUrl || 'N/A'} size={compact ? 90 : 110} level="H" />
                  </div>
                  <p className={`mt-1.5 text-[8px] font-bold tracking-[0.3em] uppercase ${theme.accent}`}>Scan to Verify</p>
                </div>

                {/* Verification URL */}
                <div className={`rounded-lg border ${theme.innerBorder} bg-white/50 p-3`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Shield className={`h-3.5 w-3.5 ${theme.accent}`} />
                    <span className="text-[9px] font-bold tracking-[0.3em] text-muted-foreground uppercase">Authenticity URL</span>
                  </div>
                  <p className="font-mono text-[8px] text-primary break-all leading-relaxed">{verifyUrl || 'N/A'}</p>
                  <p className="mt-2 text-[8px] text-muted-foreground">Visit this URL or scan the QR code to independently verify the authenticity and integrity of this certificate.</p>
                </div>
              </div>

              {/* Signatories */}
              <div className="mt-5">
                <p className={`text-center text-[9px] font-bold tracking-[0.35em] uppercase ${theme.accent} mb-3`}>
                  Authorized Signatories
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {(['Treasurer', 'Scoring Official', 'Match Referee'] as const).map((role) => {
                    const approved = approvals[role];
                    const sig = signatures.find((s) => s.role === role);
                    return (
                      <div key={role} className={`rounded-lg border ${theme.innerBorder} bg-white/60 p-2.5 text-center`}>
                        <div className={`mx-auto mb-1.5 h-8 border-b ${theme.innerBorder} flex items-end justify-center pb-0.5`}>
                          {sig ? (
                            <span className="text-xs font-semibold italic text-foreground">{sig.signerName}</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/40 italic">awaiting</span>
                          )}
                        </div>
                        <p className="text-[8px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">{role}</p>
                        {approved && (
                          <CheckCircle2 className={`mx-auto mt-0.5 h-3.5 w-3.5 ${theme.accent}`} />
                        )}
                        {sig?.signedAt && (
                          <p className="mt-0.5 text-[7px] text-muted-foreground">{formatInIST(sig.signedAt)}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Approved seal */}
              {isApproved && (
                <div className="absolute bottom-4 right-4">
                  <div className={`flex h-16 w-16 flex-col items-center justify-center rounded-full border-2 ${theme.sealRing} ${theme.sealBg} shadow-lg`}>
                    <div className={`flex h-12 w-12 flex-col items-center justify-center rounded-full border ${theme.sealRing}`}>
                      <CheckCircle2 className={`h-4 w-4 ${theme.accent}`} />
                      <span className={`text-[6px] font-bold tracking-wider ${theme.accent} uppercase`}>Certified</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Security footer strip */}
            <div className={`${theme.headerBg} px-4 py-1.5 text-center`}>
              <p className="font-mono text-[7px] tracking-[0.15em] text-amber-100/70">
                SECURED DOCUMENT • SHA-256: {(cert.security_hash || '').substring(0, 40)}… • {cert.certificate_id} • TAMPER-EVIDENT
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

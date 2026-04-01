import { useMemo } from 'react';
import { CertificateRecord } from '@/lib/v2types';
import { QRCodeSVG } from 'qrcode.react';
import { formatInIST } from '@/lib/time';
import { Shield, CheckCircle2, Clock, XCircle, Award, Star, Lock } from 'lucide-react';

type ApprovalMap = Record<'Treasurer' | 'Scoring Official' | 'Match Referee', boolean>;
type SignatureEntry = { role: string; signerName: string; signedAt: string };

/* ─── 5 THEME PALETTES ─── */
const THEMES = {
  classic: {
    name: 'Regal Ivory',
    bg: 'bg-gradient-to-br from-amber-50 via-[#fefcf4] to-amber-50',
    headerBg: 'bg-gradient-to-r from-[hsl(220,42%,18%)] via-[hsl(220,38%,24%)] to-[hsl(220,42%,18%)]',
    border: 'border-amber-700/60',
    innerBorder: 'border-amber-600/25',
    accent: 'text-amber-700',
    accentHsl: 'hsl(35,72%,40%)',
    accentBg: 'bg-amber-700/8',
    ornament: 'text-amber-600/35',
    ribbon: 'bg-amber-700',
    sealRing: 'border-amber-700',
    sealBg: 'bg-amber-50',
    securityStrip: 'bg-amber-800/90',
    guilloche: '#b8860b',
    guillocheLight: '#d4a843',
    micro: 'text-amber-700/[0.12]',
    watermark: 'text-amber-900/[0.025]',
  },
  premium: {
    name: 'Royal Sapphire',
    bg: 'bg-gradient-to-br from-blue-50 via-[#f4f7ff] to-indigo-50',
    headerBg: 'bg-gradient-to-r from-[hsl(225,52%,16%)] via-[hsl(228,48%,22%)] to-[hsl(225,52%,16%)]',
    border: 'border-blue-700/55',
    innerBorder: 'border-blue-500/20',
    accent: 'text-blue-700',
    accentHsl: 'hsl(220,65%,42%)',
    accentBg: 'bg-blue-700/8',
    ornament: 'text-blue-500/25',
    ribbon: 'bg-blue-700',
    sealRing: 'border-blue-700',
    sealBg: 'bg-blue-50',
    securityStrip: 'bg-blue-900/90',
    guilloche: '#1e40af',
    guillocheLight: '#3b82f6',
    micro: 'text-blue-700/[0.1]',
    watermark: 'text-blue-900/[0.025]',
  },
  gold: {
    name: 'Imperial Gold',
    bg: 'bg-gradient-to-br from-yellow-50 via-[#fffcf0] to-amber-50',
    headerBg: 'bg-gradient-to-r from-[hsl(38,48%,14%)] via-[hsl(36,42%,20%)] to-[hsl(38,48%,14%)]',
    border: 'border-yellow-700/55',
    innerBorder: 'border-yellow-600/20',
    accent: 'text-yellow-700',
    accentHsl: 'hsl(40,80%,38%)',
    accentBg: 'bg-yellow-700/8',
    ornament: 'text-yellow-600/25',
    ribbon: 'bg-yellow-700',
    sealRing: 'border-yellow-700',
    sealBg: 'bg-yellow-50',
    securityStrip: 'bg-yellow-900/90',
    guilloche: '#a16207',
    guillocheLight: '#ca8a04',
    micro: 'text-yellow-700/[0.1]',
    watermark: 'text-yellow-900/[0.025]',
  },
  heritage: {
    name: 'Cricket Heritage',
    bg: 'bg-gradient-to-br from-red-50 via-[#fdf6f4] to-rose-50',
    headerBg: 'bg-gradient-to-r from-[hsl(350,42%,18%)] via-[hsl(348,38%,24%)] to-[hsl(350,42%,18%)]',
    border: 'border-red-800/50',
    innerBorder: 'border-red-700/18',
    accent: 'text-red-800',
    accentHsl: 'hsl(350,55%,35%)',
    accentBg: 'bg-red-800/8',
    ornament: 'text-red-700/25',
    ribbon: 'bg-red-800',
    sealRing: 'border-red-800',
    sealBg: 'bg-red-50',
    securityStrip: 'bg-red-900/90',
    guilloche: '#991b1b',
    guillocheLight: '#dc2626',
    micro: 'text-red-800/[0.1]',
    watermark: 'text-red-900/[0.025]',
  },
  artdeco: {
    name: 'Art Deco',
    bg: 'bg-gradient-to-br from-emerald-50 via-[#f0faf5] to-teal-50',
    headerBg: 'bg-gradient-to-r from-[hsl(162,42%,14%)] via-[hsl(160,38%,20%)] to-[hsl(162,42%,14%)]',
    border: 'border-emerald-700/50',
    innerBorder: 'border-emerald-600/18',
    accent: 'text-emerald-700',
    accentHsl: 'hsl(160,60%,32%)',
    accentBg: 'bg-emerald-700/8',
    ornament: 'text-emerald-600/25',
    ribbon: 'bg-emerald-700',
    sealRing: 'border-emerald-700',
    sealBg: 'bg-emerald-50',
    securityStrip: 'bg-emerald-900/90',
    guilloche: '#047857',
    guillocheLight: '#10b981',
    micro: 'text-emerald-700/[0.1]',
    watermark: 'text-emerald-900/[0.025]',
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

/* ─── SVG GUILLOCHE PATTERN (intaglio-style) ─── */
function GuillochePattern({ color, lightColor, id }: { color: string; lightColor: string; id: string }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.12]" aria-hidden="true">
      <defs>
        <pattern id={`g-wave-${id}`} x="0" y="0" width="60" height="30" patternUnits="userSpaceOnUse">
          <path d="M0 15 Q15 0 30 15 Q45 30 60 15" fill="none" stroke={color} strokeWidth="0.5" />
          <path d="M0 20 Q15 5 30 20 Q45 35 60 20" fill="none" stroke={lightColor} strokeWidth="0.3" />
          <path d="M0 10 Q15 -5 30 10 Q45 25 60 10" fill="none" stroke={lightColor} strokeWidth="0.3" />
        </pattern>
        <pattern id={`g-rosette-${id}`} x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
          {[0, 30, 60, 90, 120, 150].map(angle => (
            <ellipse key={angle} cx="60" cy="60" rx="50" ry="12" fill="none" stroke={color} strokeWidth="0.4"
              transform={`rotate(${angle} 60 60)`} />
          ))}
          <circle cx="60" cy="60" r="8" fill="none" stroke={color} strokeWidth="0.6" />
          <circle cx="60" cy="60" r="3" fill={color} opacity="0.3" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#g-wave-${id})`} />
      <rect width="100%" height="100%" fill={`url(#g-rosette-${id})`} opacity="0.5" />
    </svg>
  );
}

/* ─── MICRO-LETTERING STRIP ─── */
function MicroLetteringStrip({ text, className }: { text: string; className?: string }) {
  const repeated = Array(20).fill(text).join(' • ');
  return (
    <div className={`overflow-hidden whitespace-nowrap select-none ${className}`} aria-hidden="true">
      <span className="text-[4px] tracking-[0.3em] font-mono uppercase leading-none">{repeated}</span>
    </div>
  );
}

/* ─── CORNER ORNAMENT (more intricate) ─── */
function CornerOrnament({ className, color }: { className?: string; color: string }) {
  return (
    <div className={`absolute w-14 h-14 ${className}`}>
      <svg viewBox="0 0 56 56" fill="none" className="w-full h-full">
        <path d="M0 0 L56 0 L56 4 L4 4 L4 56 L0 56 Z" fill={color} opacity="0.6" />
        <path d="M8 8 L44 8 L44 10 L10 10 L10 44 L8 44 Z" fill={color} opacity="0.35" />
        <path d="M14 14 L32 14 L32 15.5 L15.5 15.5 L15.5 32 L14 32 Z" fill={color} opacity="0.2" />
        <circle cx="20" cy="20" r="2.5" fill={color} opacity="0.4" />
        <circle cx="20" cy="20" r="1" fill={color} opacity="0.6" />
        {/* Decorative diamond */}
        <path d="M6 6 L8 4 L10 6 L8 8 Z" fill={color} opacity="0.5" />
      </svg>
    </div>
  );
}

/* ─── OFFICIAL SEAL ─── */
function OfficialSeal({ theme, approved }: { theme: typeof THEMES.classic; approved: boolean }) {
  if (!approved) return null;
  return (
    <div className="absolute bottom-6 right-6">
      <div className={`relative flex h-20 w-20 flex-col items-center justify-center rounded-full border-[3px] ${theme.sealRing} ${theme.sealBg} shadow-xl`}>
        <div className={`flex h-[60px] w-[60px] flex-col items-center justify-center rounded-full border-[1.5px] ${theme.sealRing}`}>
          <div className={`flex h-[46px] w-[46px] flex-col items-center justify-center rounded-full border border-dashed ${theme.sealRing}`}>
            <CheckCircle2 className={`h-4 w-4 ${theme.accent}`} />
            <span className={`text-[5px] font-bold tracking-[0.15em] ${theme.accent} uppercase mt-0.5`}>Officially</span>
            <span className={`text-[6px] font-bold tracking-[0.12em] ${theme.accent} uppercase`}>Certified</span>
          </div>
        </div>
        {/* Notches around seal */}
        {[...Array(16)].map((_, i) => (
          <div key={i} className={`absolute w-0.5 h-1.5 ${theme.ribbon} opacity-30`}
            style={{ transform: `rotate(${i * 22.5}deg) translateY(-38px)` }} />
        ))}
      </div>
    </div>
  );
}

interface Props {
  certificate: CertificateRecord;
  compact?: boolean;
}

export default function CertificateArtboard({ certificate: cert, compact = false }: Props) {
  const theme = THEMES[cert.certificate_template as keyof typeof THEMES] || THEMES.classic;
  const awardLabel = CERT_LABELS[cert.certificate_type] || 'CERTIFICATE OF EXCELLENCE';
  const themeId = cert.certificate_template || 'classic';

  const metadata = useMemo(() => {
    try {
      const parsed = cert.metadata_json ? JSON.parse(cert.metadata_json) : {};
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }, [cert.metadata_json]);

  const approvals = useMemo<ApprovalMap>(() => {
    try {
      const parsed = cert.approvals_json ? JSON.parse(cert.approvals_json) : {};
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { Treasurer: false, 'Scoring Official': false, 'Match Referee': false };
      }
      const map = parsed as Record<string, unknown>;
      return {
        Treasurer: !!map.Treasurer,
        'Scoring Official': !!map['Scoring Official'],
        'Match Referee': !!map['Match Referee'],
      };
    } catch {
      return { Treasurer: false, 'Scoring Official': false, 'Match Referee': false };
    }
  }, [cert.approvals_json]);

  const signatures = useMemo<SignatureEntry[]>(() => {
    try {
      const parsed = cert.signatures_json ? JSON.parse(cert.signatures_json) : [];
      return Array.isArray(parsed) ? parsed as SignatureEntry[] : [];
    } catch {
      return [];
    }
  }, [cert.signatures_json]);

  const isApproved = cert.approval_status === 'approved';
  const isRevoked = cert.approval_status === 'revoked';
  const isPending = !isApproved && !isRevoked;
  const verifyUrl = cert.verification_url || cert.qr_payload || '';
  const tournamentName = metadata.tournament || cert.tournament_id || 'Tournament';
  const seasonYear = metadata.seasonYear || cert.season_id || '';

  return (
    <div className={`relative select-none ${compact ? 'text-[0.82em]' : ''}`} style={{ aspectRatio: '1.414/1' }}>
      {/* Outer frame with multiple borders */}
      <div className={`relative h-full overflow-hidden rounded-lg border-[4px] ${theme.border} ${theme.bg} shadow-2xl`}>

        {/* Guilloche intaglio pattern */}
        <GuillochePattern color={theme.guilloche} lightColor={theme.guillocheLight} id={themeId} />

        {/* Micro-lettering top strip */}
        <MicroLetteringStrip
          text={`SECURED CERTIFICATE ${cert.certificate_id} TAMPER EVIDENT SHA-256 VERIFIED`}
          className={`absolute top-[18px] left-[20px] right-[20px] ${theme.micro}`}
        />

        {/* Micro-lettering bottom strip */}
        <MicroLetteringStrip
          text={`OFFICIAL DOCUMENT CRICKET CLUB HONORS BOARD ${cert.certificate_id} DO NOT ALTER`}
          className={`absolute bottom-[18px] left-[20px] right-[20px] ${theme.micro}`}
        />

        {/* Inner border system */}
        <div className={`absolute inset-[8px] rounded border-[2px] ${theme.innerBorder}`} />
        <div className={`absolute inset-[14px] rounded border border-dashed ${theme.innerBorder}`} />

        {/* Corner ornaments */}
        <CornerOrnament className="top-[10px] left-[10px]" color={theme.accentHsl} />
        <CornerOrnament className="top-[10px] right-[10px] -scale-x-100" color={theme.accentHsl} />
        <CornerOrnament className="bottom-[10px] left-[10px] -scale-y-100" color={theme.accentHsl} />
        <CornerOrnament className="bottom-[10px] right-[10px] -scale-x-100 -scale-y-100" color={theme.accentHsl} />

        {/* Full-size diagonal watermark */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[25deg] whitespace-nowrap font-display text-[5rem] font-bold tracking-[0.25em] ${theme.watermark}`}>
            {isRevoked ? 'REVOKED' : isApproved ? 'VERIFIED' : 'PENDING'}
          </div>
        </div>

        {/* Prominent status watermark for pending/revoked */}
        {(isPending || isRevoked) && (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center" aria-hidden="true">
            <div className={`-rotate-12 rounded-xl border-4 px-10 py-3 font-display text-4xl font-bold tracking-[0.3em] ${
              isRevoked ? 'border-destructive/40 text-destructive/30' : 'border-accent/40 text-accent/30'
            }`}>
              {isRevoked ? 'REVOKED' : 'PENDING'}
            </div>
          </div>
        )}

        {/* Security side strips (intaglio feel) */}
        <div className={`absolute left-[18px] top-[80px] bottom-[80px] w-[3px] rounded-full ${theme.ribbon} opacity-40`} />
        <div className={`absolute right-[18px] top-[80px] bottom-[80px] w-[3px] rounded-full ${theme.ribbon} opacity-40`} />

        {/* ═══ HEADER RIBBON ═══ */}
        <div className={`relative ${theme.headerBg} mx-[18px] mt-[22px] rounded-t px-6 py-2.5 text-center`}>
          <div className="flex items-center justify-center gap-2">
            <Star className="h-3 w-3 text-amber-300" />
            <span className="font-display text-[11px] font-semibold tracking-[0.4em] text-amber-100/90 uppercase">
              Cricket Club Honors Board
            </span>
            <Star className="h-3 w-3 text-amber-300" />
          </div>
        </div>

        {/* ═══ MAIN BODY ═══ */}
        <div className={`relative ${compact ? 'px-5 pt-3 pb-2' : 'px-7 pt-4 pb-3'}`}>

          {/* Title section */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3">
              <div className={`h-px flex-1 max-w-20 ${theme.ribbon}`} />
              <span className={`text-[9px] font-bold tracking-[0.5em] uppercase ${theme.accent}`}>★ ★ ★</span>
              <div className={`h-px flex-1 max-w-20 ${theme.ribbon}`} />
            </div>
            <h2 className={`mt-2 font-display ${compact ? 'text-2xl' : 'text-[2rem]'} font-bold tracking-[0.1em] text-foreground uppercase`}>
              Certificate of Excellence
            </h2>
            <div className={`mx-auto mt-1 h-[2px] w-56 bg-gradient-to-r from-transparent ${theme.ribbon} to-transparent rounded-full`} />
            <p className="mt-2 text-[10px] tracking-[0.25em] text-muted-foreground uppercase font-medium">
              This certificate is proudly presented to
            </p>
          </div>

          {/* Recipient name */}
          <div className="mt-3 text-center">
            <p className={`font-display ${compact ? 'text-2xl' : 'text-[2.2rem]'} font-bold tracking-wide text-primary leading-tight`}>
              {cert.recipient_name}
            </p>
            <div className="mx-auto mt-1 h-px w-72 bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
          </div>

          {/* Award & Tournament */}
          <div className="mt-3 text-center">
            <p className="text-xs text-muted-foreground">
              For exceptional performance in{' '}
              <span className="font-semibold text-foreground">{tournamentName}</span>
            </p>
            <div className={`mt-2 inline-flex items-center gap-2 rounded-full border ${theme.innerBorder} ${theme.accentBg} px-5 py-1.5`}>
              <Award className={`h-4 w-4 ${theme.accent}`} />
              <span className={`font-display text-xs font-bold tracking-[0.15em] ${theme.accent} uppercase`}>
                — {awardLabel} —
              </span>
            </div>
            <p className="mt-1.5 text-[11px] font-medium text-foreground">{cert.title}</p>
          </div>

          {/* Details grid */}
          <div className={`mt-4 grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
            {[
              { label: 'Tournament', value: tournamentName },
              { label: 'Season', value: seasonYear },
              { label: 'Issue Date', value: formatInIST(cert.generated_at) },
              { label: 'Certificate ID', value: cert.certificate_id, mono: true },
            ].map((item) => (
              <div key={item.label} className={`rounded-lg border ${theme.innerBorder} bg-white/50 backdrop-blur-sm px-3 py-1.5`}>
                <p className="text-[7px] font-bold tracking-[0.3em] text-muted-foreground uppercase">{item.label}</p>
                <p className={`mt-0.5 text-[10px] font-medium text-foreground truncate ${item.mono ? 'font-mono text-[9px]' : ''}`}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* ═══ SECURITY + QR + VERIFICATION ═══ */}
          <div className={`mt-3 grid gap-3 ${compact ? 'grid-cols-1' : 'lg:grid-cols-[1fr_auto_1fr]'} items-start`}>

            {/* Security panel */}
            <div className={`rounded-lg border ${theme.innerBorder} bg-white/40 backdrop-blur-sm p-2.5`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Lock className={`h-3 w-3 ${theme.accent}`} />
                <span className="text-[7px] font-bold tracking-[0.35em] text-muted-foreground uppercase">Security & Integrity</span>
              </div>
              <div className="space-y-1">
                <div>
                  <p className="text-[6px] font-bold tracking-[0.25em] text-muted-foreground uppercase">SHA-256 Digest</p>
                  <p className="font-mono text-[7px] text-foreground/70 break-all leading-tight">{cert.security_hash || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[6px] font-bold tracking-[0.25em] text-muted-foreground uppercase">Verification Token</p>
                  <p className="font-mono text-[7px] text-foreground/70 break-all leading-tight">{(cert.verification_token || 'N/A').substring(0, 32)}…</p>
                </div>
                <div>
                  <p className="text-[6px] font-bold tracking-[0.25em] text-muted-foreground uppercase">Status</p>
                  <span className={`inline-flex items-center gap-0.5 text-[8px] font-bold uppercase ${
                    isApproved ? 'text-primary' : isRevoked ? 'text-destructive' : 'text-accent'
                  }`}>
                    {isApproved ? <CheckCircle2 className="h-2.5 w-2.5" /> : isRevoked ? <XCircle className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                    {cert.approval_status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center justify-center">
              <div className={`rounded-xl border-2 ${theme.border} bg-white p-2 shadow-lg`}>
                <QRCodeSVG value={verifyUrl || 'N/A'} size={compact ? 80 : 100} level="H"
                  imageSettings={{ src: '', width: 0, height: 0, excavate: false }} />
              </div>
              <p className={`mt-1 text-[6px] font-bold tracking-[0.4em] uppercase ${theme.accent}`}>Scan to Verify</p>
            </div>

            {/* Verification URL */}
            <div className={`rounded-lg border ${theme.innerBorder} bg-white/40 backdrop-blur-sm p-2.5`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Shield className={`h-3 w-3 ${theme.accent}`} />
                <span className="text-[7px] font-bold tracking-[0.35em] text-muted-foreground uppercase">Authenticity URL</span>
              </div>
              <p className="font-mono text-[7px] text-primary break-all leading-relaxed">{verifyUrl || 'N/A'}</p>
              <p className="mt-1.5 text-[6px] text-muted-foreground leading-tight">
                Visit this URL or scan the QR code to independently verify the authenticity and integrity of this certificate.
              </p>
            </div>
          </div>

          {/* ═══ SIGNATORIES ═══ */}
          <div className="mt-3">
            <p className={`text-center text-[7px] font-bold tracking-[0.4em] uppercase ${theme.accent} mb-2`}>
              Authorized Signatories
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(['Treasurer', 'Scoring Official', 'Match Referee'] as const).map((role) => {
                const approved = approvals[role];
                const sig = signatures.find((s) => s.role === role);
                return (
                  <div key={role} className={`rounded-lg border ${theme.innerBorder} bg-white/50 backdrop-blur-sm p-2 text-center`}>
                    <div className={`mx-auto mb-1 h-6 border-b ${theme.innerBorder} flex items-end justify-center pb-0.5`}>
                      {sig ? (
                        <span className="text-[10px] font-semibold italic text-foreground">{sig.signerName}</span>
                      ) : (
                        <span className="text-[8px] text-muted-foreground/30 italic">awaiting</span>
                      )}
                    </div>
                    <p className="text-[6px] font-bold tracking-[0.2em] text-muted-foreground uppercase">{role}</p>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      {approved && <CheckCircle2 className={`h-3 w-3 ${theme.accent}`} />}
                      {sig?.signedAt && (
                        <p className="text-[5px] text-muted-foreground">{formatInIST(sig.signedAt)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══ SECURITY FOOTER STRIP ═══ */}
        <div className={`${theme.securityStrip} mx-[18px] mb-[22px] rounded-b px-4 py-1 text-center`}>
          <p className="font-mono text-[5px] tracking-[0.2em] text-amber-100/60 leading-tight">
            SECURED DOCUMENT • INTAGLIO PATTERN EMBEDDED • SHA-256: {(cert.security_hash || '').substring(0, 40)}… • {cert.certificate_id} • TAMPER-EVIDENT • MICRO-LETTERING PROTECTED
          </p>
        </div>

        {/* Official seal */}
        <OfficialSeal theme={theme} approved={isApproved} />
      </div>
    </div>
  );
}

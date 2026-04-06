import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CertificateRecord } from '@/lib/certificates';
import { QRCodeSVG } from 'qrcode.react';
import { Download, ChevronDown, ChevronUp, Printer, Award, Palette } from 'lucide-react';
import { useMemo, useRef, useState, memo } from 'react';
import { downloadCertificatePdf, printCertificate } from '@/lib/certificatePdf';
import { useToast } from '@/hooks/use-toast';

interface Props {
  certificate: Partial<CertificateRecord>;
  verificationUrl: string;
  template?: { template_name?: string; image_url?: string; design_config?: string };
  watermark?: boolean;
  showDownload?: boolean;
  defaultExpanded?: boolean;
}

const detailLinesFrom = (value?: string) => String(value || '')
  .split(/\n|•|\|/g)
  .map((line) => line.trim())
  .filter(Boolean)
  .slice(0, 3);

/* ─── 5 Premium Sports-Award Themes ─── */
const DESIGN_THEMES = [
  {
    id: 'classic-teal',
    name: 'Classic Teal',
    // Inspired by ref image 1: teal scalloped border, gold accents, white center
    outerBorder: '#4db8a4',
    innerBorder: '#8B6914',
    centerBg: '#ffffff',
    outerBg: '#f0faf7',
    titleColor: '#1a6b5a',
    recipientColor: '#1a1a2e',
    textColor: '#333333',
    accentColor: '#c8a415',
    badgeGradient: 'linear-gradient(135deg, #4db8a4, #2d8f7f)',
    ornamentSvgColor: '#4db8a4',
  },
  {
    id: 'royal-blue',
    name: 'Royal Blue',
    // Inspired by ref image 2: navy/steel blue border, formal style
    outerBorder: '#2c4a7c',
    innerBorder: '#8faac8',
    centerBg: '#ffffff',
    outerBg: '#e8eef5',
    titleColor: '#1a3a6b',
    recipientColor: '#111827',
    textColor: '#374151',
    accentColor: '#2c4a7c',
    badgeGradient: 'linear-gradient(135deg, #2c4a7c, #4a6fa5)',
    ornamentSvgColor: '#2c4a7c',
  },
  {
    id: 'sports-green',
    name: 'Sports Green',
    // Inspired by ref image 3: vibrant green/blue sports certificate
    outerBorder: '#16a34a',
    innerBorder: '#22c55e',
    centerBg: '#ffffff',
    outerBg: '#f0fdf4',
    titleColor: '#15803d',
    recipientColor: '#1a1a2e',
    textColor: '#374151',
    accentColor: '#f59e0b',
    badgeGradient: 'linear-gradient(135deg, #16a34a, #059669)',
    ornamentSvgColor: '#16a34a',
  },
  {
    id: 'golden-heritage',
    name: 'Golden Heritage',
    // Inspired by ref image 4: warm gold border, sports silhouettes
    outerBorder: '#b8860b',
    innerBorder: '#daa520',
    centerBg: '#fffef5',
    outerBg: '#fef9e7',
    titleColor: '#8B6914',
    recipientColor: '#1a1a2e',
    textColor: '#4a3728',
    accentColor: '#b8860b',
    badgeGradient: 'linear-gradient(135deg, #daa520, #b8860b)',
    ornamentSvgColor: '#c8a415',
  },
  {
    id: 'emerald-premium',
    name: 'Emerald Premium',
    // Green & blue sport wave style from ref image 5
    outerBorder: '#059669',
    innerBorder: '#10b981',
    centerBg: '#ffffff',
    outerBg: '#ecfdf5',
    titleColor: '#047857',
    recipientColor: '#111827',
    textColor: '#374151',
    accentColor: '#f97316',
    badgeGradient: 'linear-gradient(135deg, #059669, #0d9488)',
    ornamentSvgColor: '#059669',
  },
];

/* ─── SVG Decorative Elements (inline for PDF compatibility) ─── */

const ScallopedBorderSVG = memo(({ color }: { color: string }) => (
  <svg viewBox="0 0 1400 988" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
    {/* Top scalloped edge */}
    {Array.from({ length: 70 }, (_, i) => (
      <circle key={`t${i}`} cx={10 + i * 20} cy={8} r={8} fill="none" stroke={color} strokeWidth="1.5" opacity="0.6" />
    ))}
    {/* Bottom scalloped edge */}
    {Array.from({ length: 70 }, (_, i) => (
      <circle key={`b${i}`} cx={10 + i * 20} cy={980} r={8} fill="none" stroke={color} strokeWidth="1.5" opacity="0.6" />
    ))}
    {/* Left scalloped edge */}
    {Array.from({ length: 49 }, (_, i) => (
      <circle key={`l${i}`} cx={8} cy={10 + i * 20} r={8} fill="none" stroke={color} strokeWidth="1.5" opacity="0.6" />
    ))}
    {/* Right scalloped edge */}
    {Array.from({ length: 49 }, (_, i) => (
      <circle key={`r${i}`} cx={1392} cy={10 + i * 20} r={8} fill="none" stroke={color} strokeWidth="1.5" opacity="0.6" />
    ))}
  </svg>
));
ScallopedBorderSVG.displayName = 'ScallopedBorderSVG';

const CornerOrnamentSVG = memo(({ color, position }: { color: string; position: 'tl' | 'tr' | 'bl' | 'br' }) => {
  const transforms: Record<string, string> = {
    tl: '',
    tr: 'scale(-1,1) translate(-100,0)',
    bl: 'scale(1,-1) translate(0,-100)',
    br: 'scale(-1,-1) translate(-100,-100)',
  };
  return (
    <svg viewBox="0 0 100 100" style={{ width: '80px', height: '80px', position: 'absolute', ...(position.includes('t') ? { top: '20px' } : { bottom: '20px' }), ...(position.includes('l') ? { left: '20px' } : { right: '20px' }), pointerEvents: 'none' }}>
      <g transform={transforms[position]}>
        <path d="M5 5 L5 35 Q5 5 35 5 Z" fill={color} opacity="0.25" />
        <path d="M5 5 L5 25 Q5 8 25 5 Z" fill={color} opacity="0.4" />
        <line x1="5" y1="5" x2="5" y2="45" stroke={color} strokeWidth="2" opacity="0.5" />
        <line x1="5" y1="5" x2="45" y2="5" stroke={color} strokeWidth="2" opacity="0.5" />
      </g>
    </svg>
  );
});
CornerOrnamentSVG.displayName = 'CornerOrnamentSVG';

const MedalSVG = memo(({ color, size = 48 }: { color: string; size?: number }) => (
  <svg viewBox="0 0 64 80" width={size} height={size * 1.25} style={{ flexShrink: 0 }}>
    {/* Ribbon */}
    <polygon points="22,0 32,28 42,0" fill={color} opacity="0.7" />
    <polygon points="18,0 28,25 25,0" fill="#e74c3c" opacity="0.6" />
    <polygon points="46,0 36,25 39,0" fill="#3498db" opacity="0.6" />
    {/* Medal circle */}
    <circle cx="32" cy="45" r="22" fill={color} />
    <circle cx="32" cy="45" r="18" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
    {/* Star in medal */}
    <polygon points="32,30 35,39 44,39 37,45 39,54 32,49 25,54 27,45 20,39 29,39" fill="#fff" opacity="0.9" />
  </svg>
));
MedalSVG.displayName = 'MedalSVG';

const TrophySVG = memo(({ color, size = 44 }: { color: string; size?: number }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} style={{ flexShrink: 0 }}>
    <path d="M20 10 h24 v4 c0 14 -8 22 -12 24 c-4-2-12-10-12-24 z" fill={color} />
    <path d="M20 14 h-8 c0 10 6 14 8 14 z" fill={color} opacity="0.6" />
    <path d="M44 14 h8 c0 10 -6 14 -8 14 z" fill={color} opacity="0.6" />
    <rect x="28" y="38" width="8" height="8" fill={color} opacity="0.8" />
    <rect x="22" y="46" width="20" height="4" rx="2" fill={color} opacity="0.9" />
    <ellipse cx="32" cy="20" rx="6" ry="5" fill="#fff" opacity="0.3" />
  </svg>
));
TrophySVG.displayName = 'TrophySVG';

const CricketBallSVG = memo(({ size = 40 }: { size?: number }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} style={{ flexShrink: 0 }}>
    <circle cx="24" cy="24" r="22" fill="#cc2222" />
    <circle cx="24" cy="24" r="20" fill="#dd3333" />
    {/* Seam */}
    <path d="M12 12 Q24 20 12 36" fill="none" stroke="#fff" strokeWidth="1.5" />
    <path d="M36 12 Q24 20 36 36" fill="none" stroke="#fff" strokeWidth="1.5" />
    {/* Stitches */}
    {[14, 18, 22, 26, 30, 34].map(y => (
      <g key={y}>
        <line x1="10" y1={y} x2="13" y2={y - 1} stroke="#fff" strokeWidth="0.8" opacity="0.7" />
        <line x1="35" y1={y} x2="38" y2={y - 1} stroke="#fff" strokeWidth="0.8" opacity="0.7" />
      </g>
    ))}
  </svg>
));
CricketBallSVG.displayName = 'CricketBallSVG';

/* ─── Flourish divider ─── */
const FlourishDivider = memo(({ color, width = '240px' }: { color: string; width?: string }) => (
  <svg viewBox="0 0 240 20" style={{ width, height: 'auto', display: 'block', margin: '0 auto' }}>
    <line x1="0" y1="10" x2="90" y2="10" stroke={color} strokeWidth="1" opacity="0.5" />
    <line x1="150" y1="10" x2="240" y2="10" stroke={color} strokeWidth="1" opacity="0.5" />
    <circle cx="120" cy="10" r="3" fill={color} opacity="0.6" />
    <circle cx="108" cy="10" r="1.5" fill={color} opacity="0.4" />
    <circle cx="132" cy="10" r="1.5" fill={color} opacity="0.4" />
    <path d="M96 10 Q108 2 120 10 Q132 18 144 10" fill="none" stroke={color} strokeWidth="1" opacity="0.4" />
  </svg>
));
FlourishDivider.displayName = 'FlourishDivider';

/* ─── Main Component ─── */

export const CertificatePreview = memo(function CertificatePreview({
  certificate,
  template,
  verificationUrl,
  watermark = false,
  showDownload = true,
  defaultExpanded = false,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [designIndex, setDesignIndex] = useState(0);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const theme = DESIGN_THEMES[designIndex];

  const title = certificate.type || 'Certificate of Excellence';
  const recipient = certificate.recipient_name || 'Recipient Name';
  const tournament = certificate.tournament || 'Tournament';
  const season = certificate.season || 'Season';
  const id = certificate.id || 'CERT-XXXX';
  const status = certificate.status || 'DRAFT';
  const createdAt = certificate.created_at ? new Date(certificate.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '';
  const certifiedAt = certificate.certified_at ? new Date(certificate.certified_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '';
  const verificationCode = certificate.verification_code || '';
  const certifiedBy = certificate.certified_by || 'Portal Authority';
  const templateName = template?.template_name || certificate.template_id || theme.name;
  const detailLines = useMemo(() => detailLinesFrom(certificate.details_json), [certificate.details_json]);
  const performanceLines = useMemo(() => detailLinesFrom(certificate.performance_json), [certificate.performance_json]);

  const handleDownload = async () => {
    if (!ref.current || exporting) return;
    setExporting(true);
    try {
      await downloadCertificatePdf(ref.current, `Certificate_${id}`);
    } catch {
      toast({ title: 'Download failed', description: 'Could not render certificate as PDF.', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = async () => {
    if (!ref.current || printing) return;
    setPrinting(true);
    try {
      await printCertificate(ref.current, `Certificate ${id}`);
    } catch {
      toast({ title: 'Print failed', description: 'Could not prepare for printing.', variant: 'destructive' });
    } finally {
      setPrinting(false);
    }
  };

  const statusColor = status === 'CERTIFIED' ? 'bg-emerald-600 text-white' : status === 'APPROVED' ? 'bg-emerald-500 text-white' : status === 'PENDING_APPROVAL' ? 'bg-amber-500 text-white' : status === 'REJECTED' ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground';

  /* Derive certificate sub-title label */
  const certTypeLabel = title.length <= 22 ? title : 'Achievement';

  return (
    <Card className="overflow-hidden border border-primary/20 bg-background shadow-sm">
      <CardContent className="p-0">
        {/* Collapsed header bar */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
        >
          <div className="flex min-w-0 items-center gap-2">
            <Award className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-semibold">{recipient}</span>
            <Badge variant="outline" className="font-mono text-[10px]">{id}</Badge>
            <Badge className={cn('text-[10px]', statusColor)}>{status}</Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">{title}</span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {expanded && (
          <>
            {/* Theme picker */}
            <div className="flex items-center gap-2 overflow-x-auto border-b bg-muted/20 px-3 py-2">
              <Palette className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {DESIGN_THEMES.map((t, idx) => (
                <button
                  key={t.id}
                  onClick={() => setDesignIndex(idx)}
                  className={cn(
                    'shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold transition-all',
                    idx === designIndex
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>

            {/* Certificate body — exported to PDF */}
            <div className="p-2 sm:p-4">
              <div
                ref={ref}
                className="certificate-pdf-root mx-auto w-full overflow-hidden"
                style={{
                  maxWidth: '1120px',
                  aspectRatio: '297 / 210',
                  background: theme.outerBg,
                  position: 'relative',
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  color: theme.textColor,
                  boxSizing: 'border-box',
                  borderRadius: '4px',
                }}
              >
                {/* Scalloped decorative border */}
                <ScallopedBorderSVG color={theme.outerBorder} />

                {/* Inner rectangular border */}
                <div style={{
                  position: 'absolute',
                  top: '18px', left: '18px', right: '18px', bottom: '18px',
                  border: `3px solid ${theme.outerBorder}`,
                  borderRadius: '2px',
                  pointerEvents: 'none',
                }} />
                <div style={{
                  position: 'absolute',
                  top: '24px', left: '24px', right: '24px', bottom: '24px',
                  border: `1.5px solid ${theme.innerBorder}`,
                  pointerEvents: 'none',
                }} />

                {/* Corner ornaments */}
                <CornerOrnamentSVG color={theme.innerBorder} position="tl" />
                <CornerOrnamentSVG color={theme.innerBorder} position="tr" />
                <CornerOrnamentSVG color={theme.innerBorder} position="bl" />
                <CornerOrnamentSVG color={theme.innerBorder} position="br" />

                {/* Watermark */}
                {watermark && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ transform: 'rotate(-25deg)', fontSize: '64px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: theme.outerBorder, opacity: 0.08 }}>Certified</span>
                  </div>
                )}

                {/* White center panel */}
                <div style={{
                  position: 'absolute',
                  top: '32px', left: '32px', right: '32px', bottom: '32px',
                  background: theme.centerBg,
                  display: 'flex',
                  flexDirection: 'column',
                  boxSizing: 'border-box',
                }}>
                  {/* ── Top decorative strip ── */}
                  <div style={{
                    height: '6px',
                    background: theme.badgeGradient,
                    width: '100%',
                    flexShrink: 0,
                  }} />

                  {/* ── Main content area ── */}
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px 32px 12px',
                    textAlign: 'center',
                    minHeight: 0,
                    position: 'relative',
                  }}>
                    {/* Top row: medal + title area + trophy */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '20px', width: '100%', marginBottom: '4px' }}>
                      <MedalSVG color={theme.accentColor} size={40} />
                      <div style={{ textAlign: 'center', flex: 1, maxWidth: '600px' }}>
                        {/* "CERTIFICATE" heading */}
                        <div style={{
                          fontSize: '28px',
                          fontWeight: 700,
                          letterSpacing: '8px',
                          textTransform: 'uppercase',
                          color: theme.titleColor,
                          fontFamily: "'Georgia', serif",
                          lineHeight: 1,
                        }}>
                          CERTIFICATE
                        </div>
                        <div style={{
                          fontSize: '13px',
                          letterSpacing: '5px',
                          textTransform: 'uppercase',
                          color: theme.accentColor,
                          fontWeight: 600,
                          marginTop: '2px',
                          fontFamily: 'Arial, sans-serif',
                        }}>
                          OF {certTypeLabel.toUpperCase()}
                        </div>
                      </div>
                      <TrophySVG color={theme.accentColor} size={38} />
                    </div>

                    {/* Flourish divider */}
                    <FlourishDivider color={theme.innerBorder} width="220px" />

                    {/* "This certificate is proudly presented to" */}
                    <p style={{
                      margin: '8px 0 0',
                      fontSize: '10px',
                      letterSpacing: '3px',
                      textTransform: 'uppercase',
                      color: theme.textColor,
                      fontFamily: 'Arial, sans-serif',
                      opacity: 0.7,
                    }}>
                      This certificate is proudly presented to
                    </p>

                    {/* ─── Recipient Name ─── */}
                    <p style={{
                      margin: '6px 0 0',
                      fontSize: recipient.length > 28 ? '26px' : '32px',
                      fontWeight: 700,
                      lineHeight: 1.15,
                      color: theme.recipientColor,
                      fontFamily: "'Georgia', serif",
                      fontStyle: 'italic',
                      letterSpacing: '1px',
                      maxWidth: '85%',
                    }}>
                      {recipient}
                    </p>

                    {/* Underline below name */}
                    <div style={{
                      width: '280px',
                      height: '2px',
                      background: `linear-gradient(90deg, transparent, ${theme.accentColor}, transparent)`,
                      margin: '6px auto 8px',
                    }} />

                    {/* Description */}
                    <p style={{
                      margin: '0 auto',
                      maxWidth: '500px',
                      fontSize: '10px',
                      lineHeight: 1.7,
                      color: theme.textColor,
                      fontFamily: "'Georgia', serif",
                      opacity: 0.85,
                    }}>
                      In recognition of outstanding achievement and exceptional dedication
                      in <strong style={{ color: theme.titleColor }}>{tournament}</strong> — Season <strong style={{ color: theme.titleColor }}>{season}</strong>.
                    </p>

                    {/* Detail & Performance pills */}
                    {(detailLines.length > 0 || performanceLines.length > 0) && (
                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {detailLines.length > 0 && (
                          <div style={{ border: `1px solid ${theme.outerBorder}33`, borderRadius: '6px', padding: '5px 10px', background: `${theme.outerBorder}08`, textAlign: 'left', maxWidth: '210px' }}>
                            <p style={{ margin: 0, fontSize: '7px', textTransform: 'uppercase', letterSpacing: '2px', color: theme.titleColor, fontFamily: 'Arial, sans-serif', fontWeight: 700 }}>Highlights</p>
                            {detailLines.map((line) => <p key={line} style={{ margin: '1px 0 0', fontSize: '8px', color: theme.textColor }}>• {line}</p>)}
                          </div>
                        )}
                        {performanceLines.length > 0 && (
                          <div style={{ border: `1px solid ${theme.outerBorder}33`, borderRadius: '6px', padding: '5px 10px', background: `${theme.outerBorder}08`, textAlign: 'left', maxWidth: '210px' }}>
                            <p style={{ margin: 0, fontSize: '7px', textTransform: 'uppercase', letterSpacing: '2px', color: theme.titleColor, fontFamily: 'Arial, sans-serif', fontWeight: 700 }}>Performance</p>
                            {performanceLines.map((line) => <p key={line} style={{ margin: '1px 0 0', fontSize: '8px', color: theme.textColor }}>• {line}</p>)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Cricket ball decoration — bottom left of content area */}
                    <div style={{ position: 'absolute', bottom: '8px', left: '16px', opacity: 0.15 }}>
                      <CricketBallSVG size={36} />
                    </div>
                  </div>

                  {/* ── Bottom section — Date / Authority / QR ── */}
                  <div style={{
                    borderTop: `1px solid ${theme.outerBorder}30`,
                    padding: '10px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    gap: '12px',
                    flexShrink: 0,
                  }}>
                    {/* Left: Date + Template */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '7px', letterSpacing: '2px', textTransform: 'uppercase', color: theme.textColor, fontFamily: 'Arial, sans-serif', opacity: 0.5 }}>Date</p>
                      <div style={{ width: '80px', height: '1px', background: theme.outerBorder, opacity: 0.3, margin: '12px 0 3px' }} />
                      <p style={{ margin: 0, fontSize: '9px', color: theme.textColor }}>{createdAt || 'Pending'}</p>
                    </div>

                    {/* Center: Certified by */}
                    <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: theme.recipientColor, fontFamily: "'Georgia', serif" }}>{certifiedBy}</p>
                      <div style={{ width: '100px', height: '1px', background: theme.outerBorder, opacity: 0.4, margin: '3px auto' }} />
                      <p style={{ margin: 0, fontSize: '7px', letterSpacing: '2px', textTransform: 'uppercase', color: theme.textColor, fontFamily: 'Arial, sans-serif', opacity: 0.5 }}>Certifying Authority</p>
                      {certifiedAt && <p style={{ margin: '1px 0 0', fontSize: '7px', color: theme.textColor, opacity: 0.5 }}>{certifiedAt} IST</p>}
                    </div>

                    {/* Right: QR + Verification */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ margin: 0, fontSize: '7px', letterSpacing: '1px', textTransform: 'uppercase', color: theme.textColor, fontFamily: 'Arial, sans-serif', opacity: 0.5 }}>Signature</p>
                          <div style={{ width: '80px', height: '1px', background: theme.outerBorder, opacity: 0.3, margin: '12px 0 3px' }} />
                          <p style={{ margin: 0, fontSize: '7px', fontFamily: "'Courier New', monospace", color: theme.textColor, opacity: 0.6, wordBreak: 'break-all', maxWidth: '100px' }}>{verificationCode || id}</p>
                        </div>
                        <div style={{ background: '#ffffff', padding: '3px', border: `1px solid ${theme.outerBorder}40`, borderRadius: '3px', lineHeight: 0 }}>
                          <QRCodeSVG value={verificationUrl} size={48} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom decorative strip */}
                  <div style={{
                    height: '6px',
                    background: theme.badgeGradient,
                    width: '100%',
                    flexShrink: 0,
                  }} />
                </div>
              </div>
            </div>

            {/* Download/Print bar */}
            {showDownload && (
              <div className="cert-download-bar flex flex-col items-center justify-between gap-2 border-t bg-muted/30 px-4 py-2 sm:flex-row">
                <p className="text-xs text-muted-foreground">{id} • {status} • {theme.name} • A4 Landscape</p>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handlePrint} disabled={printing}>
                    {printing ? 'Preparing...' : <><Printer className="mr-1 h-3 w-3" /> Print</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleDownload} disabled={exporting}>
                    {exporting ? 'Generating...' : <><Download className="mr-1 h-3 w-3" /> Download PDF</>}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});

export default CertificatePreview;

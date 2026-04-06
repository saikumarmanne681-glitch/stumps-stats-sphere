import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CertificateRecord } from '@/lib/certificates';
import { QRCodeSVG } from 'qrcode.react';
import { Download, ShieldCheck, Palette, ChevronDown, ChevronUp, Printer, Award, Star, Trophy } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
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

const DESIGN_THEMES = [
  {
    id: 'emerald-prestige',
    name: 'Emerald Prestige',
    outerBg: 'linear-gradient(145deg, #064e3b 0%, #065f46 30%, #047857 60%, #059669 100%)',
    innerBg: 'rgba(255,255,255,0.06)',
    accent: '#fbbf24',
    accentSecondary: '#d4a017',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.85)',
    textMuted: 'rgba(255,255,255,0.6)',
    borderColor: 'rgba(251,191,36,0.35)',
    borderAccent: 'rgba(251,191,36,0.6)',
    ornamentColor: 'rgba(251,191,36,0.12)',
  },
  {
    id: 'royal-sapphire',
    name: 'Royal Sapphire',
    outerBg: 'linear-gradient(145deg, #0c1445 0%, #1e1b6e 35%, #312e81 65%, #3730a3 100%)',
    innerBg: 'rgba(255,255,255,0.05)',
    accent: '#f8fafc',
    accentSecondary: '#c4b5fd',
    textPrimary: '#f8fafc',
    textSecondary: 'rgba(248,250,252,0.85)',
    textMuted: 'rgba(248,250,252,0.55)',
    borderColor: 'rgba(196,181,253,0.35)',
    borderAccent: 'rgba(196,181,253,0.6)',
    ornamentColor: 'rgba(196,181,253,0.1)',
  },
  {
    id: 'ivory-classic',
    name: 'Ivory Classic',
    outerBg: 'linear-gradient(145deg, #fefce8 0%, #fef9c3 30%, #fef3c7 60%, #fde68a 100%)',
    innerBg: 'rgba(120,53,15,0.04)',
    accent: '#78350f',
    accentSecondary: '#92400e',
    textPrimary: '#451a03',
    textSecondary: 'rgba(69,26,3,0.8)',
    textMuted: 'rgba(69,26,3,0.5)',
    borderColor: 'rgba(120,53,15,0.25)',
    borderAccent: 'rgba(120,53,15,0.5)',
    ornamentColor: 'rgba(120,53,15,0.08)',
  },
  {
    id: 'cricket-heritage',
    name: 'Cricket Heritage',
    outerBg: 'linear-gradient(145deg, #14532d 0%, #166534 30%, #15803d 60%, #16a34a 100%)',
    innerBg: 'rgba(255,255,255,0.05)',
    accent: '#fde68a',
    accentSecondary: '#fbbf24',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.85)',
    textMuted: 'rgba(255,255,255,0.55)',
    borderColor: 'rgba(253,230,138,0.3)',
    borderAccent: 'rgba(253,230,138,0.55)',
    ornamentColor: 'rgba(253,230,138,0.1)',
  },
  {
    id: 'midnight-gold',
    name: 'Midnight Gold',
    outerBg: 'linear-gradient(145deg, #1c1917 0%, #292524 35%, #44403c 65%, #57534e 100%)',
    innerBg: 'rgba(251,191,36,0.04)',
    accent: '#fbbf24',
    accentSecondary: '#f59e0b',
    textPrimary: '#fefce8',
    textSecondary: 'rgba(254,252,232,0.85)',
    textMuted: 'rgba(254,252,232,0.5)',
    borderColor: 'rgba(251,191,36,0.3)',
    borderAccent: 'rgba(251,191,36,0.55)',
    ornamentColor: 'rgba(251,191,36,0.08)',
  },
];

export function CertificatePreview({
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
      toast({ title: 'Download failed', description: 'Could not render this certificate as PDF. Please retry.', variant: 'destructive' });
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
      toast({ title: 'Print failed', description: 'Could not prepare this certificate for printing. Please retry.', variant: 'destructive' });
    } finally {
      setPrinting(false);
    }
  };

  const statusColor = status === 'CERTIFIED' ? 'bg-emerald-600 text-white' : status === 'PENDING' ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground';

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

            {/* Certificate body — this is what gets exported to PDF */}
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
                  color: theme.textPrimary,
                  boxSizing: 'border-box',
                }}
              >
                {/* Ornamental corner decorations */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '120px', height: '120px', borderRight: `2px solid ${theme.borderAccent}`, borderBottom: `2px solid ${theme.borderAccent}`, borderBottomRightRadius: '40px', margin: '16px', opacity: 0.5 }} />
                <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', borderLeft: `2px solid ${theme.borderAccent}`, borderBottom: `2px solid ${theme.borderAccent}`, borderBottomLeftRadius: '40px', margin: '16px', opacity: 0.5 }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '120px', height: '120px', borderRight: `2px solid ${theme.borderAccent}`, borderTop: `2px solid ${theme.borderAccent}`, borderTopRightRadius: '40px', margin: '16px', opacity: 0.5 }} />
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: '120px', height: '120px', borderLeft: `2px solid ${theme.borderAccent}`, borderTop: `2px solid ${theme.borderAccent}`, borderTopLeftRadius: '40px', margin: '16px', opacity: 0.5 }} />

                {/* Double border frame */}
                <div style={{ position: 'absolute', inset: '10px', border: `1.5px solid ${theme.borderColor}`, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', inset: '16px', border: `1px solid ${theme.borderColor}`, pointerEvents: 'none' }} />

                {/* Watermark */}
                {watermark && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ transform: 'rotate(-25deg)', fontSize: '72px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em', color: theme.ornamentColor, fontFamily: 'Georgia, serif' }}>Certified</span>
                  </div>
                )}

                {/* Main content */}
                <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', padding: '28px 36px', boxSizing: 'border-box' }}>

                  {/* Top bar: org name + verification code */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Trophy style={{ width: 16, height: 16, color: theme.accent, flexShrink: 0 }} />
                      <span style={{ fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: 700, color: theme.accent, fontFamily: 'Arial, sans-serif' }}>
                        Cricket Club Portal
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '7px', letterSpacing: '2px', textTransform: 'uppercase', color: theme.textMuted, fontFamily: 'Arial, sans-serif' }}>Verification Code</p>
                      <p style={{ margin: '1px 0 0', fontSize: '13px', fontWeight: 700, fontFamily: "'Courier New', monospace", color: theme.accent, letterSpacing: '2px' }}>{verificationCode || 'PENDING'}</p>
                    </div>
                  </div>

                  {/* Decorative line */}
                  <div style={{ height: '1px', background: `linear-gradient(90deg, transparent 0%, ${theme.borderAccent} 20%, ${theme.borderAccent} 80%, transparent 100%)`, margin: '6px 0 12px' }} />

                  {/* Center content — the main certificate body */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 0 }}>

                    {/* Stars */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                      {[...Array(3)].map((_, i) => (
                        <Star key={i} style={{ width: 14, height: 14, color: theme.accent, fill: theme.accent }} />
                      ))}
                    </div>

                    <p style={{ margin: 0, fontSize: '10px', letterSpacing: '6px', textTransform: 'uppercase', color: theme.textMuted, fontFamily: 'Arial, sans-serif' }}>
                      Certificate of
                    </p>
                    <h1 style={{ margin: '4px 0 0', fontSize: '32px', fontWeight: 700, letterSpacing: '4px', textTransform: 'uppercase', color: theme.accent, lineHeight: 1.1, fontFamily: 'Georgia, serif' }}>
                      {title.length > 20 ? title : 'Excellence'}
                    </h1>
                    {title.length > 20 && (
                      <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: 600, color: theme.textSecondary, letterSpacing: '1px' }}>{title}</p>
                    )}

                    {/* Divider */}
                    <div style={{ width: '200px', height: '1px', background: `linear-gradient(90deg, transparent, ${theme.borderAccent}, transparent)`, margin: '10px auto' }} />

                    <p style={{ margin: 0, fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', color: theme.textMuted, fontFamily: 'Arial, sans-serif' }}>
                      This certificate is proudly presented to
                    </p>

                    {/* Recipient name — the hero */}
                    <p style={{
                      margin: '8px 0 0',
                      fontSize: recipient.length > 28 ? '28px' : '36px',
                      fontWeight: 700,
                      lineHeight: 1.15,
                      color: theme.textPrimary,
                      fontFamily: 'Georgia, serif',
                      letterSpacing: '1px',
                      maxWidth: '90%',
                    }}>
                      {recipient}
                    </p>

                    {/* Underline below name */}
                    <div style={{ width: '280px', height: '2px', background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`, margin: '8px auto 10px' }} />

                    {/* Description */}
                    <p style={{ margin: '0 auto', maxWidth: '520px', fontSize: '10px', lineHeight: 1.6, color: theme.textSecondary, fontFamily: 'Georgia, serif' }}>
                      In recognition of outstanding achievement, exceptional dedication, and verified performance excellence in <strong>{tournament}</strong> — Season <strong>{season}</strong>.
                    </p>

                    {/* Detail & Performance pills */}
                    {(detailLines.length > 0 || performanceLines.length > 0) && (
                      <div style={{ display: 'flex', gap: '12px', marginTop: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {detailLines.length > 0 && (
                          <div style={{ border: `1px solid ${theme.borderColor}`, borderRadius: '8px', padding: '6px 12px', background: theme.innerBg, textAlign: 'left', maxWidth: '220px' }}>
                            <p style={{ margin: 0, fontSize: '7px', textTransform: 'uppercase', letterSpacing: '2px', color: theme.textMuted, fontFamily: 'Arial, sans-serif' }}>Highlights</p>
                            {detailLines.map((line) => <p key={line} style={{ margin: '2px 0 0', fontSize: '9px', color: theme.textSecondary }}>• {line}</p>)}
                          </div>
                        )}
                        {performanceLines.length > 0 && (
                          <div style={{ border: `1px solid ${theme.borderColor}`, borderRadius: '8px', padding: '6px 12px', background: theme.innerBg, textAlign: 'left', maxWidth: '220px' }}>
                            <p style={{ margin: 0, fontSize: '7px', textTransform: 'uppercase', letterSpacing: '2px', color: theme.textMuted, fontFamily: 'Arial, sans-serif' }}>Performance</p>
                            {performanceLines.map((line) => <p key={line} style={{ margin: '2px 0 0', fontSize: '9px', color: theme.textSecondary }}>• {line}</p>)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Decorative line */}
                  <div style={{ height: '1px', background: `linear-gradient(90deg, transparent 0%, ${theme.borderAccent} 20%, ${theme.borderAccent} 80%, transparent 100%)`, margin: '8px 0' }} />

                  {/* Bottom section — 3 columns: Issued / Authority / QR */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px' }}>
                    {/* Left: Issued info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '7px', letterSpacing: '2px', textTransform: 'uppercase', color: theme.textMuted, fontFamily: 'Arial, sans-serif' }}>Date Issued</p>
                      <p style={{ margin: '2px 0 0', fontSize: '10px', color: theme.textSecondary }}>{createdAt ? `${createdAt} IST` : 'Pending'}</p>
                      <p style={{ margin: '4px 0 0', fontSize: '7px', letterSpacing: '2px', textTransform: 'uppercase', color: theme.textMuted, fontFamily: 'Arial, sans-serif' }}>Template</p>
                      <p style={{ margin: '2px 0 0', fontSize: '9px', color: theme.textSecondary }}>{templateName}</p>
                    </div>

                    {/* Center: Certified by */}
                    <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                      <div style={{ width: '100px', height: '1px', background: theme.borderAccent, margin: '0 auto 4px' }} />
                      <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: theme.textPrimary }}>{certifiedBy}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '7px', letterSpacing: '2px', textTransform: 'uppercase', color: theme.textMuted, fontFamily: 'Arial, sans-serif' }}>Certifying Authority</p>
                      <p style={{ margin: '2px 0 0', fontSize: '8px', color: theme.textMuted }}>{certifiedAt ? `${certifiedAt} IST` : 'Awaiting certification'}</p>
                    </div>

                    {/* Right: QR & security */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                            <ShieldCheck style={{ width: 10, height: 10, color: theme.accent }} />
                            <span style={{ fontSize: '7px', letterSpacing: '1px', textTransform: 'uppercase', color: theme.textMuted, fontFamily: 'Arial, sans-serif' }}>Verified</span>
                          </div>
                          <p style={{ margin: '2px 0 0', fontSize: '7px', fontFamily: "'Courier New', monospace", color: theme.textMuted, textAlign: 'right', wordBreak: 'break-all', maxWidth: '120px' }}>{id}</p>
                        </div>
                        <div style={{ background: '#ffffff', padding: '4px', borderRadius: '4px', lineHeight: 0 }}>
                          <QRCodeSVG value={verificationUrl} size={52} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Download/Print bar */}
            {showDownload && (
              <div className="cert-download-bar flex flex-col items-center justify-between gap-2 border-t bg-muted/30 px-4 py-2 sm:flex-row">
                <p className="text-xs text-muted-foreground">{id} • {status} • {theme.name} • A4 landscape</p>
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
}

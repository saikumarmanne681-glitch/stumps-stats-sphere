import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CertificateRecord } from '@/lib/certificates';
import { QRCodeSVG } from 'qrcode.react';
import { Download, ShieldCheck, Palette, ChevronDown, ChevronUp, Printer } from 'lucide-react';
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
    id: 'aurora-glass',
    name: 'Aurora Glass',
    outerBg: 'radial-gradient(circle at 10% 12%, #e6fffa 0%, #dbeafe 40%, #ede9fe 100%)',
    accent: '#14532d',
    accentSecondary: '#0f766e',
    softBg: 'rgba(255,255,255,0.72)',
    borderColor: 'rgba(15,118,110,0.34)',
  },
  {
    id: 'royal-nocturne',
    name: 'Royal Nocturne',
    outerBg: 'linear-gradient(145deg, #0f172a 0%, #1e293b 38%, #312e81 100%)',
    accent: '#f8fafc',
    accentSecondary: '#c4b5fd',
    softBg: 'rgba(15, 23, 42, 0.66)',
    borderColor: 'rgba(196,181,253,0.42)',
  },
  {
    id: 'champion-sunrise',
    name: 'Champion Sunrise',
    outerBg: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 36%, #ffedd5 100%)',
    accent: '#9a3412',
    accentSecondary: '#dc2626',
    softBg: 'rgba(255,255,255,0.78)',
    borderColor: 'rgba(154,52,18,0.34)',
  },
  {
    id: 'emerald-luxe',
    name: 'Emerald Luxe',
    outerBg: 'linear-gradient(140deg, #ecfdf5 0%, #d1fae5 42%, #f0fdf4 100%)',
    accent: '#065f46',
    accentSecondary: '#047857',
    softBg: 'rgba(255,255,255,0.78)',
    borderColor: 'rgba(6,95,70,0.35)',
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

  return (
    <Card className="overflow-hidden border border-primary/20 bg-background shadow-sm">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">{id}</Badge>
            <span className="truncate text-sm font-semibold">{recipient}</span>
            <Badge className="text-[10px]">{status}</Badge>
          </div>
          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}
            {expanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>

        {expanded && (
          <>
            <div className="flex items-center gap-2 overflow-x-auto border-b bg-muted/20 px-3 py-2 scrollbar-thin">
              <Palette className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">Design:</span>
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

            <div
              ref={ref}
              className="certificate-pdf-root relative mx-auto w-full max-w-[1120px] overflow-hidden"
              style={{
                aspectRatio: '297 / 210',
                backgroundImage: theme.outerBg,
                padding: '22px',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ position: 'absolute', inset: '12px', border: `1px solid ${theme.borderColor}`, borderRadius: '22px', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', inset: '18px', border: `1px solid ${theme.borderColor}`, borderRadius: '16px', pointerEvents: 'none', opacity: 0.8 }} />

              {watermark && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ transform: 'rotate(-23deg)', fontSize: '56px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.18)' }}>Certified</span>
                </div>
              )}

              <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ border: `1px solid ${theme.borderColor}`, borderRadius: '999px', padding: '5px 14px', background: theme.softBg }}>
                    <p style={{ margin: 0, fontSize: '8px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700, color: theme.accentSecondary }}>Cricket Club Portal • Certified Registry</p>
                  </div>
                  <div style={{ border: `1px solid ${theme.borderColor}`, borderRadius: '12px', padding: '6px 12px', background: theme.softBg, textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: '7px', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.8 }}>Verification</p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', fontWeight: 700, fontFamily: 'monospace' }}>{verificationCode || 'PENDING'}</p>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 2.2fr 1.15fr', gap: '12px', minHeight: 0 }}>
                  <div style={{ background: theme.softBg, border: `1px solid ${theme.borderColor}`, borderRadius: '14px', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '8px', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.8 }}>Award</p>
                      <p style={{ margin: '8px 0 0', fontSize: '17px', lineHeight: 1.2, fontWeight: 800 }}>{title}</p>
                      <p style={{ margin: '6px 0 0', fontSize: '10px', opacity: 0.9 }}>{tournament} • Season {season}</p>
                    </div>
                    <div style={{ borderTop: `1px dashed ${theme.borderColor}`, paddingTop: '8px' }}>
                      <p style={{ margin: 0, fontSize: '7px', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.8 }}>Template</p>
                      <p style={{ margin: '3px 0 0', fontSize: '10px', fontWeight: 700 }}>{templateName}</p>
                      <p style={{ margin: '6px 0 0', fontSize: '8px', fontFamily: 'monospace', opacity: 0.8 }}>{id}</p>
                    </div>
                  </div>

                  <div style={{ background: theme.softBg, border: `1px solid ${theme.borderColor}`, borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '4px', opacity: 0.75 }}>Certificate of Excellence</p>
                    <p style={{ margin: '6px 0 0', fontSize: '26px', fontWeight: 900, letterSpacing: '2px', color: theme.accent }}>Presented To</p>
                    <p style={{ margin: '8px auto 0', maxWidth: '95%', fontSize: recipient.length > 28 ? '24px' : '29px', fontWeight: 900, lineHeight: 1.1 }}>{recipient}</p>
                    <p style={{ margin: '8px auto 0', maxWidth: '430px', fontSize: '11px', lineHeight: 1.45, opacity: 0.95 }}>
                      In recognition of exceptional commitment, impact, and verified performance standards recorded in the official competition ledger.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'center' }}>
                      {detailLines.length > 0 && (
                        <div style={{ width: '48%', border: `1px solid ${theme.borderColor}`, borderRadius: '10px', padding: '8px', textAlign: 'left', background: 'rgba(255,255,255,0.45)' }}>
                          <p style={{ margin: 0, fontSize: '7px', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.7 }}>Highlights</p>
                          {detailLines.map((line) => <p key={line} style={{ margin: '3px 0 0', fontSize: '9px' }}>• {line}</p>)}
                        </div>
                      )}
                      {performanceLines.length > 0 && (
                        <div style={{ width: '48%', border: `1px solid ${theme.borderColor}`, borderRadius: '10px', padding: '8px', textAlign: 'left', background: 'rgba(255,255,255,0.45)' }}>
                          <p style={{ margin: 0, fontSize: '7px', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.7 }}>Performance</p>
                          {performanceLines.map((line) => <p key={line} style={{ margin: '3px 0 0', fontSize: '9px' }}>• {line}</p>)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ background: theme.softBg, border: `1px solid ${theme.borderColor}`, borderRadius: '14px', padding: '10px', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '8px', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.8 }}>Scan & Verify</p>
                      <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'center' }}><QRCodeSVG value={verificationUrl} size={72} /></div>
                      <p style={{ margin: '6px 0 0', fontSize: '8px', opacity: 0.8 }}>Public verification route</p>
                    </div>
                    <div style={{ background: theme.softBg, border: `1px solid ${theme.borderColor}`, borderRadius: '14px', padding: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: theme.accentSecondary }}>
                        <ShieldCheck style={{ width: 14, height: 14 }} />
                        <span style={{ fontSize: '10px', fontWeight: 700 }}>Digital Security Layer</span>
                      </div>
                      <p style={{ margin: '5px 0 0', fontSize: '8px', lineHeight: 1.35, opacity: 0.85 }}>Checksum, verification token, and QR registry are embedded for reliable PDF and printed validation.</p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', borderTop: `1px dashed ${theme.borderColor}`, paddingTop: '8px' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '7px', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.75 }}>Issued</p>
                    <p style={{ margin: '3px 0 0', fontSize: '10px' }}>{createdAt ? `${createdAt} IST` : 'Pending'}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '7px', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.75 }}>Certified By</p>
                    <p style={{ margin: '3px 0 0', fontSize: '10px', fontWeight: 700 }}>{certifiedBy}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '8px', opacity: 0.75 }}>{certifiedAt ? `${certifiedAt} IST` : 'Awaiting approval'}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '7px', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.75 }}>Verification URL</p>
                    <p style={{ margin: '3px 0 0', fontSize: '7px', fontFamily: 'monospace', lineHeight: 1.4, wordBreak: 'break-all' }}>{verificationUrl}</p>
                  </div>
                </div>
              </div>
            </div>

            {showDownload && (
              <div className="cert-download-bar flex flex-col items-center justify-between gap-2 border-t bg-muted/30 px-4 py-2 sm:flex-row">
                <p className="text-xs text-muted-foreground">{id} • {status} • {theme.name} • A4 landscape</p>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handlePrint} disabled={printing}>
                    {printing ? 'Preparing print...' : <><Printer className="mr-1 h-3 w-3" /> Print</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleDownload} disabled={exporting}>
                    {exporting ? 'Generating PDF...' : <><Download className="mr-1 h-3 w-3" /> Download PDF</>}
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

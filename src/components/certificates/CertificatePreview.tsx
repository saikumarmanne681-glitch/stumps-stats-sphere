import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CertificateRecord } from '@/lib/certificates';
import { QRCodeSVG } from 'qrcode.react';
import { Download, ShieldCheck, Palette } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { downloadCertificatePdf } from '@/lib/certificatePdf';
import { useToast } from '@/hooks/use-toast';

interface Props {
  certificate: Partial<CertificateRecord>;
  verificationUrl: string;
  template?: { template_name?: string; image_url?: string; design_config?: string };
  watermark?: boolean;
  showDownload?: boolean;
}

const detailLinesFrom = (value?: string) => String(value || '')
  .split(/\n|•|\|/g)
  .map((line) => line.trim())
  .filter(Boolean)
  .slice(0, 3);

const DESIGN_THEMES = [
  {
    id: 'regal-ivory',
    name: 'Regal Ivory',
    outerBg: 'linear-gradient(135deg, hsl(35, 30%, 95%) 0%, hsl(40, 25%, 92%) 50%, hsl(35, 35%, 90%) 100%)',
    accent: '#8B7355',
    accentLight: 'hsl(35, 40%, 92%)',
    borderColor: 'hsl(35,40%,70%)',
  },
  {
    id: 'royal-sapphire',
    name: 'Royal Sapphire',
    outerBg: 'linear-gradient(135deg, hsl(215, 40%, 94%) 0%, hsl(220, 35%, 90%) 50%, hsl(215, 30%, 92%) 100%)',
    accent: '#3B5998',
    accentLight: 'hsl(215, 40%, 92%)',
    borderColor: 'hsl(215,40%,70%)',
  },
  {
    id: 'imperial-green',
    name: 'Imperial Green',
    outerBg: 'linear-gradient(135deg, hsl(140, 15%, 97%) 0%, hsl(145, 20%, 94%) 52%, hsl(140, 10%, 94%) 100%)',
    accent: '#1B5E3B',
    accentLight: 'hsl(145, 30%, 92%)',
    borderColor: 'hsl(145,30%,65%)',
  },
  {
    id: 'cricket-heritage',
    name: 'Cricket Heritage',
    outerBg: 'linear-gradient(135deg, hsl(28, 30%, 95%) 0%, hsl(30, 25%, 90%) 50%, hsl(25, 35%, 88%) 100%)',
    accent: '#8B5E3C',
    accentLight: 'hsl(28, 35%, 92%)',
    borderColor: 'hsl(28,35%,65%)',
  },
  {
    id: 'art-deco',
    name: 'Art Deco',
    outerBg: 'linear-gradient(135deg, hsl(50, 15%, 95%) 0%, hsl(45, 12%, 90%) 50%, hsl(48, 18%, 88%) 100%)',
    accent: '#7A6B3A',
    accentLight: 'hsl(48, 25%, 92%)',
    borderColor: 'hsl(48,30%,60%)',
  },
];

export function CertificatePreview({ certificate, template, verificationUrl, watermark = false, showDownload = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [designIndex, setDesignIndex] = useState(2);
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

  return (
    <Card className="overflow-hidden border border-primary/20 bg-background shadow-sm">
      <CardContent className="p-0">
        {/* Design Selector */}
        <div className="flex items-center gap-2 overflow-x-auto border-b bg-muted/30 px-3 py-2 scrollbar-thin">
          <Palette className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">Design:</span>
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

        {/* Certificate Body - Clean PDF-safe layout */}
        <div
          ref={ref}
          className="certificate-pdf-root relative mx-auto w-full max-w-[1120px] overflow-hidden"
          style={{
            aspectRatio: '297 / 210',
            backgroundImage: theme.outerBg,
            padding: '24px',
            boxSizing: 'border-box',
          }}
        >
          {/* Decorative borders */}
          <div style={{ position: 'absolute', inset: '12px', border: `1px solid ${theme.borderColor}`, borderRadius: '16px', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: '20px', border: `1px solid ${theme.borderColor}`, borderRadius: '12px', pointerEvents: 'none', opacity: 0.5 }} />

          {watermark && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <span style={{ transform: 'rotate(-24deg)', fontSize: '48px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.35em', color: 'rgba(27,94,59,0.08)' }}>Certified</span>
            </div>
          )}

          {/* Inner content */}
          <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', padding: '16px 20px' }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ display: 'inline-block', background: theme.accent, color: '#fff', fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '6px', letterSpacing: '0.5px' }}>Cricket Club Portal</span>
                <p style={{ marginTop: '6px', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '3px', color: '#888' }}>Official Landscape Certificate</p>
              </div>
              <div style={{ textAlign: 'right', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '6px 12px' }}>
                <p style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#888', margin: 0 }}>Verification Code</p>
                <p style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', margin: '2px 0 0' }}>{verificationCode || 'Pending'}</p>
              </div>
            </div>

            {/* Main body - 3 column */}
            <div style={{ flex: 1, display: 'flex', gap: '16px', marginTop: '12px', minHeight: 0 }}>
              {/* Left column */}
              <div style={{ width: '22%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px' }}>
                <div>
                  <p style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '2px', color: theme.accent, margin: 0 }}>Award Brief</p>
                  <p style={{ fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '6px', lineHeight: 1.2 }}>{title}</p>
                  <p style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>{tournament} • Season {season}</p>
                </div>
                <div>
                  <div style={{ marginBottom: '8px' }}>
                    <p style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '2px', color: '#888', margin: 0 }}>Design</p>
                    <p style={{ fontSize: '11px', fontWeight: 600, margin: '2px 0 0' }}>{theme.name}</p>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <p style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '2px', color: '#888', margin: 0 }}>Certificate ID</p>
                    <p style={{ fontSize: '10px', fontWeight: 600, fontFamily: 'monospace', margin: '2px 0 0' }}>{id}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '2px', color: '#888', margin: 0 }}>Status</p>
                    <span style={{ display: 'inline-block', marginTop: '2px', fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: status === 'CERTIFIED' ? theme.accent : '#f3f4f6', color: status === 'CERTIFIED' ? '#fff' : '#374151' }}>{status}</span>
                  </div>
                </div>
              </div>

              {/* Center column */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 8px' }}>
                <p style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '3px', color: '#888', margin: 0 }}>Certificate of Achievement</p>
                <p style={{ fontSize: '18px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '4px', color: theme.accent, marginTop: '8px' }}>Presented To</p>
                <p style={{ fontSize: recipient.length > 28 ? '20px' : '26px', fontWeight: 800, marginTop: '10px', lineHeight: 1.2, wordBreak: 'break-word' }}>{recipient}</p>
                <p style={{ fontSize: '11px', color: '#666', marginTop: '10px', maxWidth: '400px', lineHeight: 1.5 }}>
                  This document confirms outstanding performance, contribution, and officially recorded recognition within the competition registry.
                </p>
                <span style={{ display: 'inline-block', marginTop: '10px', border: `1px solid ${theme.borderColor}`, background: theme.accentLight, borderRadius: '999px', padding: '4px 16px', fontSize: '12px', fontWeight: 600 }}>{title}</span>

                {(detailLines.length > 0 || performanceLines.length > 0) && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px', width: '100%', maxWidth: '420px' }}>
                    {detailLines.length > 0 && (
                      <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px', textAlign: 'left', background: '#fafafa' }}>
                        <p style={{ fontSize: '7px', textTransform: 'uppercase', letterSpacing: '2px', color: '#888', margin: 0 }}>Match Notes</p>
                        {detailLines.map((line) => <p key={line} style={{ fontSize: '9px', margin: '3px 0 0', color: '#374151' }}>• {line}</p>)}
                      </div>
                    )}
                    {performanceLines.length > 0 && (
                      <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px', textAlign: 'left', background: '#fafafa' }}>
                        <p style={{ fontSize: '7px', textTransform: 'uppercase', letterSpacing: '2px', color: '#888', margin: 0 }}>Performance</p>
                        {performanceLines.map((line) => <p key={line} style={{ fontSize: '9px', margin: '3px 0 0', color: '#374151' }}>• {line}</p>)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right column */}
              <div style={{ width: '22%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
                  <p style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '2px', color: '#888', margin: '0 0 6px' }}>Verification</p>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <QRCodeSVG value={verificationUrl} size={72} />
                  </div>
                  <p style={{ fontSize: '9px', color: '#888', marginTop: '4px' }}>Scan QR to verify</p>
                </div>
                <div style={{ background: theme.accentLight, border: `1px solid ${theme.borderColor}`, borderRadius: '10px', padding: '8px' }}>
                  <p style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '2px', color: '#888', margin: 0 }}>Authority Seal</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', color: theme.accent }}>
                    <ShieldCheck style={{ width: 14, height: 14 }} />
                    <span style={{ fontSize: '10px', fontWeight: 600 }}>Digitally certified</span>
                  </div>
                  <p style={{ fontSize: '9px', color: '#666', marginTop: '4px', lineHeight: 1.4 }}>Tamper-evident verification for public authenticity checks.</p>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '8px' }}>
                  <p style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '2px', color: '#888', margin: 0 }}>Verification URL</p>
                  <p style={{ fontSize: '8px', fontFamily: 'monospace', wordBreak: 'break-all', marginTop: '3px', color: '#555' }}>{verificationUrl}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '8px', marginTop: '8px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '7px', textTransform: 'uppercase', letterSpacing: '2px', color: '#888', margin: 0 }}>Issued</p>
                <p style={{ fontSize: '10px', margin: '2px 0 0' }}>{createdAt ? `${createdAt} IST` : 'Pending'}</p>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '7px', textTransform: 'uppercase', letterSpacing: '2px', color: '#888', margin: 0 }}>Certified By</p>
                <p style={{ fontSize: '10px', fontWeight: 600, margin: '2px 0 0' }}>{certifiedBy}</p>
                <p style={{ fontSize: '8px', color: '#888', margin: '1px 0 0' }}>{certifiedAt ? `${certifiedAt} IST` : 'Awaiting approval'}</p>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '7px', textTransform: 'uppercase', letterSpacing: '2px', color: '#888', margin: 0 }}>Security Strip</p>
                <p style={{ fontSize: '8px', color: '#888', margin: '2px 0 0', lineHeight: 1.4 }}>Registry checksum, verification code, and QR trace embedded in downloadable A4 landscape certificate.</p>
              </div>
            </div>

            {/* Bottom ticker */}
            <div style={{ marginTop: '4px', overflow: 'hidden', borderRadius: '999px', border: '1px solid #e5e7eb', padding: '2px 8px', background: '#fafafa' }}>
              <p style={{ fontSize: '4px', letterSpacing: '2px', textAlign: 'center', color: 'rgba(27,94,59,0.25)', whiteSpace: 'nowrap', margin: 0 }}>
                {'CRICKET CLUB PORTAL • OFFICIAL CERTIFICATE • TAMPER EVIDENT DOCUMENT • '.repeat(8)}
              </p>
            </div>
          </div>
        </div>

        {/* Download bar */}
        {showDownload && (
          <div className="cert-download-bar flex flex-col gap-2 sm:flex-row items-center justify-between border-t bg-muted/30 px-4 py-2">
            <p className="text-xs text-muted-foreground">{id} • {status} • {theme.name} • Landscape A4 PDF</p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              disabled={exporting}
            >
              {exporting ? 'Generating PDF...' : <><Download className="h-3 w-3 mr-1" /> Download PDF</>}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

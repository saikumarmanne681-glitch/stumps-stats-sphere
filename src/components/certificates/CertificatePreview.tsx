import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CertificateRecord } from '@/lib/certificates';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Download, ShieldCheck, Palette } from 'lucide-react';
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

const fitClass = (text: string) => {
  if (text.length > 32) return 'text-lg md:text-xl';
  if (text.length > 22) return 'text-xl md:text-2xl';
  return 'text-2xl md:text-3xl';
};

const detailLinesFrom = (value?: string) => String(value || '')
  .split(/\n|•|\|/g)
  .map((line) => line.trim())
  .filter(Boolean)
  .slice(0, 4);

// Design themes
const DESIGN_THEMES = [
  {
    id: 'regal-ivory',
    name: 'Regal Ivory',
    outerBg: 'linear-gradient(135deg, hsl(35, 30%, 95%) 0%, hsl(40, 25%, 92%) 50%, hsl(35, 35%, 90%) 100%)',
    innerBg: 'bg-card/70',
    pattern: 'repeating-linear-gradient(135deg, hsl(35, 40%, 80%, 0.06) 0 12px, transparent 12px 28px)',
    border1: 'border-[hsl(35,40%,70%)]',
    border2: 'border-[hsl(35,50%,65%)]',
    topLine: 'from-transparent via-[hsl(35,50%,65%)]/40 to-transparent',
    bottomLine: 'from-transparent via-[hsl(35,60%,55%)]/50 to-transparent',
    titleColor: 'text-[hsl(35,45%,30%)]',
    accentBadge: 'bg-[hsl(35,50%,50%)] text-white',
    pillBg: 'border-[hsl(35,40%,70%)]/40 bg-[hsl(35,50%,50%)]/10',
    sealBg: 'border-[hsl(35,40%,60%)]/20 bg-[hsl(35,50%,50%)]/5',
  },
  {
    id: 'royal-sapphire',
    name: 'Royal Sapphire',
    outerBg: 'linear-gradient(135deg, hsl(215, 40%, 94%) 0%, hsl(220, 35%, 90%) 50%, hsl(215, 30%, 92%) 100%)',
    innerBg: 'bg-card/70',
    pattern: 'repeating-linear-gradient(135deg, hsl(215, 50%, 60%, 0.06) 0 12px, transparent 12px 28px)',
    border1: 'border-[hsl(215,40%,70%)]',
    border2: 'border-[hsl(215,50%,60%)]',
    topLine: 'from-transparent via-[hsl(215,50%,60%)]/40 to-transparent',
    bottomLine: 'from-transparent via-[hsl(215,60%,50%)]/50 to-transparent',
    titleColor: 'text-[hsl(215,50%,30%)]',
    accentBadge: 'bg-[hsl(215,50%,45%)] text-white',
    pillBg: 'border-[hsl(215,40%,65%)]/40 bg-[hsl(215,50%,45%)]/10',
    sealBg: 'border-[hsl(215,40%,55%)]/20 bg-[hsl(215,50%,45%)]/5',
  },
  {
    id: 'imperial-green',
    name: 'Imperial Green',
    outerBg: 'radial-gradient(circle at 18% 18%, hsl(145, 40%, 90%, 0.8), transparent 40%), radial-gradient(circle at 82% 16%, hsl(35, 50%, 88%, 0.6), transparent 40%), linear-gradient(135deg, hsl(140, 15%, 97%) 0%, hsl(145, 20%, 94%) 52%, hsl(140, 10%, 94%) 100%)',
    innerBg: 'bg-card/60',
    pattern: 'repeating-linear-gradient(135deg, hsl(145, 63%, 32%, 0.03) 0 12px, transparent 12px 28px)',
    border1: 'border-primary/25',
    border2: 'border-accent/35',
    topLine: 'from-transparent via-primary/35 to-transparent',
    bottomLine: 'from-transparent via-accent/45 to-transparent',
    titleColor: 'text-primary',
    accentBadge: 'bg-primary text-primary-foreground',
    pillBg: 'border-accent/35 bg-accent/10',
    sealBg: 'border-primary/15 bg-primary/5',
  },
  {
    id: 'cricket-heritage',
    name: 'Cricket Heritage',
    outerBg: 'linear-gradient(135deg, hsl(28, 30%, 95%) 0%, hsl(30, 25%, 90%) 50%, hsl(25, 35%, 88%) 100%)',
    innerBg: 'bg-card/60',
    pattern: 'repeating-linear-gradient(45deg, hsl(28, 40%, 75%, 0.05) 0 10px, transparent 10px 22px)',
    border1: 'border-[hsl(28,35%,65%)]',
    border2: 'border-[hsl(35,55%,55%)]',
    topLine: 'from-transparent via-[hsl(28,40%,60%)]/40 to-transparent',
    bottomLine: 'from-transparent via-[hsl(35,55%,50%)]/50 to-transparent',
    titleColor: 'text-[hsl(28,40%,25%)]',
    accentBadge: 'bg-[hsl(28,50%,40%)] text-white',
    pillBg: 'border-[hsl(28,40%,65%)]/40 bg-[hsl(28,50%,40%)]/10',
    sealBg: 'border-[hsl(28,35%,55%)]/20 bg-[hsl(28,50%,40%)]/5',
  },
  {
    id: 'art-deco',
    name: 'Art Deco',
    outerBg: 'linear-gradient(135deg, hsl(50, 15%, 95%) 0%, hsl(45, 12%, 90%) 50%, hsl(48, 18%, 88%) 100%)',
    innerBg: 'bg-card/60',
    pattern: 'repeating-linear-gradient(0deg, hsl(48, 30%, 70%, 0.06) 0 2px, transparent 2px 18px), repeating-linear-gradient(90deg, hsl(48, 30%, 70%, 0.06) 0 2px, transparent 2px 18px)',
    border1: 'border-[hsl(48,30%,60%)]',
    border2: 'border-[hsl(48,45%,50%)]',
    topLine: 'from-transparent via-[hsl(48,40%,55%)]/50 to-transparent',
    bottomLine: 'from-transparent via-[hsl(48,50%,45%)]/50 to-transparent',
    titleColor: 'text-[hsl(48,35%,25%)]',
    accentBadge: 'bg-[hsl(48,40%,40%)] text-white',
    pillBg: 'border-[hsl(48,35%,55%)]/40 bg-[hsl(48,40%,40%)]/10',
    sealBg: 'border-[hsl(48,30%,50%)]/20 bg-[hsl(48,40%,40%)]/5',
  },
];

export function CertificatePreview({ certificate, template, verificationUrl, watermark = false, showDownload = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [designIndex, setDesignIndex] = useState(2); // Default: Imperial Green (matches brand)
  const theme = DESIGN_THEMES[designIndex];

  const title = certificate.type || 'Certificate of Excellence';
  const recipient = certificate.recipient_name || 'Recipient Name';
  const match = certificate.match_id || 'N/A';
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
      toast({
        title: 'Download failed',
        description: 'Could not render this certificate as PDF. Please retry.',
        variant: 'destructive',
      });
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

        <div
          ref={ref}
          className="relative mx-auto box-border w-full max-w-[1120px] overflow-hidden border border-primary/20 p-3 sm:p-4"
          style={{
            aspectRatio: '297 / 210',
            backgroundImage: theme.outerBg,
          }}
        >
          <div className="absolute inset-0 opacity-70" style={{ backgroundImage: theme.pattern }} />
          <div className={`pointer-events-none absolute inset-3 rounded-[1.5rem] border ${theme.border1}`} />
          <div className={`pointer-events-none absolute inset-5 rounded-[1.2rem] border ${theme.border2}`} />
          <div className={`pointer-events-none absolute left-5 right-5 top-5 h-px bg-gradient-to-r ${theme.topLine}`} />
          <div className={`pointer-events-none absolute left-5 right-5 bottom-5 h-px bg-gradient-to-r ${theme.bottomLine}`} />

          {watermark && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="rotate-[-24deg] text-5xl font-black uppercase tracking-[0.35em] text-primary/10">Certified</span>
            </div>
          )}

          <div className={`relative z-10 flex h-full flex-col rounded-[1.3rem] border border-border/70 ${theme.innerBg} px-4 py-4 backdrop-blur-[1px] sm:px-5 sm:py-5 md:px-8 md:py-7`}>
            <div className="flex items-start justify-between gap-2 sm:gap-4">
              <div className="text-left">
                <Badge className={theme.accentBadge}>Cricket Club Portal</Badge>
                <p className="mt-2 text-[8px] sm:text-[9px] uppercase tracking-[0.3em] sm:tracking-[0.45em] text-muted-foreground">Official landscape certificate</p>
              </div>
              <div className="rounded-xl border border-border bg-background/80 px-3 py-2 text-right shadow-sm">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Verification Code</p>
                <p className="font-mono text-xs font-semibold">{verificationCode || 'Pending'}</p>
              </div>
            </div>

            <div className="mt-3 grid flex-1 gap-3 sm:gap-4 md:mt-5 md:gap-5 md:grid-cols-[1fr_1.3fr_0.95fr]">
              <div className={`flex flex-col justify-between gap-4 rounded-[1.2rem] border ${theme.sealBg.split(' ')[0]} bg-background/80 p-4 text-left shadow-sm`}>
                <div>
                  <p className={`text-[10px] uppercase tracking-[0.35em] ${theme.titleColor}`}>Award brief</p>
                  <p className="mt-2 font-display text-xl uppercase tracking-[0.14em] text-foreground">{title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{tournament} • Season {season}</p>
                  {match !== 'N/A' && <p className="text-xs text-muted-foreground">Linked match: {match}</p>}
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Design</p>
                    <p className="text-sm font-semibold text-foreground">{theme.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Certificate ID</p>
                    <p className="font-mono text-xs font-semibold text-foreground">{id}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Status</p>
                    <Badge variant={status === 'CERTIFIED' ? 'default' : 'outline'} className={`mt-1 text-[10px] ${status === 'CERTIFIED' ? 'bg-primary' : ''}`}>{status}</Badge>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-center text-center">
                <p className="text-[10px] uppercase tracking-[0.42em] text-muted-foreground">Certificate of achievement</p>
                <h3 className={cn('mt-3 font-display text-lg sm:text-2xl font-semibold uppercase tracking-[0.2em] sm:tracking-[0.25em]', theme.titleColor)}>Presented to</h3>
                <h2 className={cn('mx-auto mt-4 max-w-[680px] break-words font-display font-bold text-foreground', fitClass(recipient))}>{recipient}</h2>
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">This document confirms outstanding performance, contribution, and officially recorded recognition within the competition registry.</p>
                <div className={cn('mx-auto mt-4 inline-flex max-w-full items-center justify-center rounded-full border px-3 py-1.5 sm:px-5 sm:py-2 text-center text-sm sm:text-base font-semibold text-foreground shadow-sm', theme.pillBg)}>
                  {title}
                </div>
                {(detailLines.length > 0 || performanceLines.length > 0) && (
                  <div className="mx-auto mt-5 grid w-full max-w-[540px] gap-3 text-left md:grid-cols-2">
                    {detailLines.length > 0 && (
                      <div className="rounded-xl border border-border/70 bg-background/70 p-3">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Match notes</p>
                        <ul className="mt-2 space-y-1 text-xs text-foreground/85">
                          {detailLines.map((line) => <li key={line}>• {line}</li>)}
                        </ul>
                      </div>
                    )}
                    {performanceLines.length > 0 && (
                      <div className="rounded-xl border border-border/70 bg-background/70 p-3">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Performance</p>
                        <ul className="mt-2 space-y-1 text-xs text-foreground/85">
                          {performanceLines.map((line) => <li key={line}>• {line}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={`flex flex-col justify-between gap-4 rounded-[1.2rem] border ${theme.border2.replace('border-', 'border-').replace(']', '/25]')} bg-background/80 p-4 text-left shadow-sm`}>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">Verification</p>
                  <div className="mt-3 flex justify-center rounded-[1rem] border border-border bg-card p-3">
                    <QRCodeSVG value={verificationUrl} size={96} />
                  </div>
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">Scan QR to verify authenticity</p>
                </div>
                <div className={`rounded-xl border ${theme.sealBg.split(' ')[0]} ${theme.sealBg.split(' ').slice(1).join(' ')} p-3`}>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Authority Seal</p>
                  <div className={cn('mt-2 flex items-center gap-2', theme.titleColor)}>
                    <ShieldCheck className="h-5 w-5" />
                    <span className="text-xs font-semibold">Digitally certified</span>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">Tamper-evident verification enabled for public authenticity checks.</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-card/90 p-3">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Verification URL</p>
                  <p className="mt-1 break-all font-mono text-[10px] text-foreground/80">{verificationUrl}</p>
                  <div className={cn('mt-2 flex items-center gap-1', theme.titleColor)}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <p className="text-[10px] font-medium">Public authenticity check enabled</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 sm:mt-5 grid w-full gap-2 sm:gap-3 border-t border-border/60 pt-3 sm:pt-4 text-left md:grid-cols-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Issued</p>
                <p className="text-xs text-foreground">{createdAt ? `${createdAt} IST` : 'Pending issue date'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Certified by</p>
                <p className="text-xs font-semibold text-foreground">{certifiedBy}</p>
                <p className="mt-2 text-[10px] text-muted-foreground">{certifiedAt ? `${certifiedAt} IST` : 'Awaiting full approval'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Security strip</p>
                <p className="text-[10px] leading-5 text-muted-foreground">Registry checksum, verification code, and QR trace are embedded in the downloadable A4 landscape certificate.</p>
              </div>
            </div>

            <div className="mt-3 w-full overflow-hidden rounded-full border border-border/60 bg-background/70 px-2 py-1">
              <p className="text-[4px] tracking-[0.3em] text-center text-primary/35 select-none whitespace-nowrap">
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
              loading={exporting}
              loadingText="Generating PDF..."
            >
              <Download className="h-3 w-3 mr-1" /> Download PDF
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

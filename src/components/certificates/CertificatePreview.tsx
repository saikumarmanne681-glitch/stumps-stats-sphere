import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CertificateRecord } from '@/lib/certificates';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Download, ShieldCheck } from 'lucide-react';
import { useRef, useState } from 'react';
import { downloadCertificatePdf } from '@/lib/certificatePdf';

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

export function CertificatePreview({ certificate, template, verificationUrl, watermark = false, showDownload = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
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

  const handleDownload = async () => {
    if (!ref.current || exporting) return;
    setExporting(true);
    try {
      await downloadCertificatePdf(ref.current, `Certificate_${id}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="overflow-hidden border border-amber-500/30 bg-background">
      <CardContent className="p-0">
        <div
          ref={ref}
          className="relative mx-auto w-full max-w-[1120px] overflow-hidden p-6 md:p-10"
          style={{
            aspectRatio: '297 / 210',
            backgroundImage: template?.image_url
              ? `linear-gradient(rgba(252,250,245,.97),rgba(255,255,255,.97)),url(${template.image_url})`
              : 'radial-gradient(circle at top right,#fffbeb 0,#fff 42%,#f8fafc 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-2 rounded-xl border-2 border-amber-500/40 pointer-events-none" />
          <div className="absolute inset-4 rounded-lg border border-amber-500/20 pointer-events-none" />

          {watermark && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="rotate-[-24deg] text-5xl font-black uppercase tracking-[0.35em] text-emerald-700/10">Certified</span>
            </div>
          )}

          <div className="relative z-10 flex h-full flex-col text-center">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <Badge className="bg-emerald-700 text-white">Cricket Club Portal</Badge>
                <p className="mt-2 text-[9px] uppercase tracking-[0.45em] text-amber-900/70">Official Certificate</p>
              </div>
              <div className="rounded-lg border border-emerald-700/30 bg-emerald-50 px-3 py-2 text-right">
                <p className="text-[10px] uppercase tracking-wider text-emerald-700">Verification Code</p>
                <p className="font-mono text-xs font-semibold">{verificationCode || 'Pending'}</p>
              </div>
            </div>

            <h3 className="mt-6 font-display text-xl font-semibold uppercase tracking-[0.25em] text-amber-900">Certificate of Achievement</h3>
            <div className="mt-2 h-px w-full bg-gradient-to-r from-transparent via-amber-500/70 to-transparent" />

            <p className="mt-4 text-sm text-muted-foreground">This certifies that</p>
            <h2 className={cn('mt-2 font-display font-bold text-primary break-words max-w-[680px]', fitClass(recipient))}>{recipient}</h2>

            <p className="mt-4 max-w-2xl text-sm text-foreground/80">has been awarded</p>
            <p className="mt-2 rounded-md bg-white/80 px-4 py-1.5 text-lg font-semibold text-amber-900 border border-amber-200/50">{title}</p>

            <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{tournament} • Season {season}{match !== 'N/A' ? ` • Match ${match}` : ''}</p>

            {/* Details */}
            {certificate.details_json && (
              <p className="mt-3 max-w-lg text-xs text-muted-foreground italic">{certificate.details_json}</p>
            )}
            {certificate.performance_json && (
              <p className="mt-1 max-w-lg text-xs text-muted-foreground">{certificate.performance_json}</p>
            )}

            {/* Certificate metadata grid */}
            <div className="mt-6 grid w-full grid-cols-2 gap-3 border-t border-amber-300/50 pt-4 text-left md:grid-cols-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Certificate ID</p>
                <p className="font-mono text-xs font-semibold">{id}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</p>
                <Badge variant={status === 'CERTIFIED' ? 'default' : 'outline'} className="text-[10px]">{status}</Badge>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Template</p>
                <p className="text-xs font-semibold">{template?.template_name || certificate.template_id || 'Default'}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Certified By</p>
                <p className="text-xs font-semibold">{certifiedBy}</p>
              </div>
            </div>

            {/* Dates */}
            <div className="mt-3 grid w-full grid-cols-2 gap-3 text-left">
              {createdAt && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Issued</p>
                  <p className="text-xs">{createdAt} IST</p>
                </div>
              )}
              {certifiedAt && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Certified</p>
                  <p className="text-xs">{certifiedAt} IST</p>
                </div>
              )}
            </div>

            <div className="mt-6 grid w-full items-end gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-amber-200/60 bg-white/80 p-3 text-left">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Authority Seal</p>
                <div className="mt-2 flex items-center gap-2 text-emerald-700">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="text-xs font-semibold">Digitally certified</span>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">Tamper-evident record preserved in certificate registry.</p>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-lg border border-amber-200/60 bg-white/80 p-3">
                <QRCodeSVG value={verificationUrl} size={96} />
                <p className="text-[10px] text-muted-foreground">Scan QR to verify</p>
              </div>
              <div className="rounded-lg border border-amber-200/60 bg-white/80 p-3 text-left">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Verification URL</p>
                <p className="mt-1 break-all font-mono text-[10px] text-foreground/80">{verificationUrl}</p>
                <div className="mt-2 flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <p className="text-[10px] font-medium">Public authenticity check enabled</p>
                </div>
              </div>
            </div>

            <div className="mt-4 w-full overflow-hidden">
              <p className="text-[4px] text-amber-700/20 tracking-[0.3em] text-center select-none whitespace-nowrap">
                {'CRICKET CLUB PORTAL • OFFICIAL CERTIFICATE • TAMPER EVIDENT DOCUMENT • '.repeat(8)}
              </p>
            </div>
          </div>
        </div>

        {/* Download bar */}
        {showDownload && (
          <div className="cert-download-bar flex items-center justify-between border-t bg-muted/30 px-4 py-2">
            <p className="text-xs text-muted-foreground">{id} • {status}</p>
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

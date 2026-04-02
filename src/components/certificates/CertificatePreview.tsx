import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CertificateRecord } from '@/lib/certificates';
import { QRCodeSVG } from 'qrcode.react';
import { Download } from 'lucide-react';
import { useRef } from 'react';

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

function downloadCertificateAsImage(element: HTMLElement, filename: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const html = `<!DOCTYPE html><html><head><title>${filename}</title><style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: white; }
    @media print { body { margin: 0; } .cert-wrapper { page-break-inside: avoid; } }
  </style></head><body><div class="cert-wrapper">${element.innerHTML}</div>
  <script>setTimeout(()=>{window.print();window.close();},500)<\/script></body></html>`;
  printWindow.document.write(html);
  printWindow.document.close();
}

export function CertificatePreview({ certificate, template, verificationUrl, watermark = false, showDownload = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);
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

  return (
    <Card className="overflow-hidden border-2 border-amber-400/40">
      <CardContent className="p-0">
        <div
          ref={ref}
          className="relative min-h-[520px] p-6 md:p-10"
          style={{
            backgroundImage: template?.image_url
              ? `linear-gradient(rgba(255,255,255,.9),rgba(255,255,255,.95)),url(${template.image_url})`
              : 'linear-gradient(140deg,#fff8e1,#fef3c7,#fffbeb)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Decorative border */}
          <div className="absolute inset-2 border-2 border-amber-300/30 rounded-lg pointer-events-none" />
          <div className="absolute inset-3 border border-amber-200/20 rounded-lg pointer-events-none" />

          {watermark && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="rotate-[-24deg] text-5xl font-black uppercase tracking-[0.35em] text-emerald-700/10">Verified Certificate</span>
            </div>
          )}

          <div className="relative z-10 flex h-full flex-col items-center text-center">
            {/* Header */}
            <Badge className="mb-2 bg-emerald-600 text-white">Cricket Club Portal</Badge>
            <p className="text-[9px] uppercase tracking-[0.5em] text-amber-700/60 mb-3">Official Document</p>

            <h3 className="font-display text-xl font-semibold uppercase tracking-[0.25em] text-amber-900">Certificate</h3>
            <div className="mt-1 h-px w-32 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

            <p className="mt-4 text-sm text-muted-foreground">This certifies that</p>
            <h2 className={cn('mt-2 font-display font-bold text-primary break-words max-w-[680px]', fitClass(recipient))}>{recipient}</h2>

            <p className="mt-4 max-w-2xl text-sm text-foreground/80">has been awarded</p>
            <p className="mt-2 rounded-md bg-white/80 px-4 py-1.5 text-lg font-semibold text-amber-900 border border-amber-200/50">{title}</p>

            <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{tournament} • Season {season}{match !== 'N/A' ? ` • Match: ${match}` : ''}</p>

            {/* Details */}
            {certificate.details_json && (
              <p className="mt-3 max-w-lg text-xs text-muted-foreground italic">{certificate.details_json}</p>
            )}
            {certificate.performance_json && (
              <p className="mt-1 max-w-lg text-xs text-muted-foreground">{certificate.performance_json}</p>
            )}

            {/* Certificate metadata grid */}
            <div className="mt-6 grid w-full max-w-2xl grid-cols-2 gap-3 border-t border-amber-200/40 pt-4 text-left md:grid-cols-4">
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
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Verification</p>
                <p className="font-mono text-[10px]">{verificationCode || 'Pending'}</p>
              </div>
            </div>

            {/* Dates */}
            <div className="mt-3 grid w-full max-w-2xl grid-cols-2 gap-3 text-left">
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

            {/* QR + verification URL */}
            <div className="mt-6 flex flex-col items-center gap-2 rounded-lg bg-white/80 p-4 border border-amber-200/30">
              <QRCodeSVG value={verificationUrl} size={90} />
              <p className="text-[10px] text-muted-foreground">Scan to verify authenticity</p>
              <p className="text-[9px] text-muted-foreground/70 break-all max-w-[300px]">{verificationUrl}</p>
            </div>

            {/* Micro-lettering security strip */}
            <div className="mt-4 w-full max-w-2xl overflow-hidden">
              <p className="text-[4px] text-amber-700/20 tracking-[0.3em] text-center select-none whitespace-nowrap">
                {'CRICKET CLUB PORTAL • OFFICIAL CERTIFICATE • TAMPER EVIDENT DOCUMENT • '.repeat(8)}
              </p>
            </div>
          </div>
        </div>

        {/* Download bar */}
        {showDownload && (
          <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2">
            <p className="text-xs text-muted-foreground">{id} • {status}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => ref.current && downloadCertificateAsImage(ref.current, `Certificate_${id}`)}
            >
              <Download className="h-3 w-3 mr-1" /> Download PDF
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

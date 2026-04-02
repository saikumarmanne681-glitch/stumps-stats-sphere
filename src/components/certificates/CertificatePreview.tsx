import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CertificateRecord } from '@/lib/certificates';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
  certificate: Partial<CertificateRecord>;
  verificationUrl: string;
  template?: { template_name?: string; image_url?: string; design_config?: string };
  watermark?: boolean;
}

const fitClass = (text: string) => {
  if (text.length > 32) return 'text-lg md:text-xl';
  if (text.length > 22) return 'text-xl md:text-2xl';
  return 'text-2xl md:text-3xl';
};

export function CertificatePreview({ certificate, template, verificationUrl, watermark = false }: Props) {
  const title = certificate.type || 'Certificate of Excellence';
  const recipient = certificate.recipient_name || 'Recipient Name';
  const match = certificate.match_id || 'N/A';
  const tournament = certificate.tournament || 'Tournament';
  const season = certificate.season || 'Season';
  const id = certificate.id || 'CERT-XXXX';

  return (
    <Card className="overflow-hidden border-2 border-amber-400/40">
      <CardContent className="p-0">
        <div
          className="relative min-h-[520px] p-6 md:p-10"
          style={{
            backgroundImage: template?.image_url
              ? `linear-gradient(rgba(255,255,255,.9),rgba(255,255,255,.95)),url(${template.image_url})`
              : 'linear-gradient(140deg,#fff8e1,#fef3c7,#fffbeb)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {watermark && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="rotate-[-24deg] text-5xl font-black uppercase tracking-[0.35em] text-emerald-700/10">Verified Certificate</span>
            </div>
          )}
          <div className="relative z-10 flex h-full flex-col items-center text-center">
            <Badge className="mb-4 bg-emerald-600 text-white">Cricket Club Portal</Badge>
            <h3 className="font-display text-xl font-semibold uppercase tracking-[0.25em] text-amber-900">Certificate</h3>
            <p className="mt-3 text-sm text-muted-foreground">This certifies that</p>
            <h2 className={cn('mt-2 font-display font-bold text-primary break-words max-w-[680px]', fitClass(recipient))}>{recipient}</h2>
            <p className="mt-4 max-w-2xl text-sm text-foreground/80">has been awarded</p>
            <p className="mt-2 rounded-md bg-white/80 px-4 py-1 text-lg font-semibold text-amber-900">{title}</p>
            <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{tournament} • {season} • Match: {match}</p>
            <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-4 border-t pt-4 text-left md:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Certificate ID</p>
                <p className="font-mono text-sm font-semibold">{id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Template</p>
                <p className="text-sm font-semibold">{template?.template_name || certificate.template_id || 'Default Template'}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col items-center gap-2 rounded-lg bg-white/80 p-3">
              <QRCodeSVG value={verificationUrl} size={90} />
              <p className="text-[11px] text-muted-foreground break-all">{verificationUrl}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

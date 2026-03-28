import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ShieldAlert, Clock3, Download } from 'lucide-react';
import { CertificateRecord } from '@/lib/v2types';
import { v2api } from '@/lib/v2api';
import { verifyCertificateIntegrity } from '@/lib/certificateSecurity';
import { downloadCertificatePdf } from '@/lib/certificatePdf';
import { formatInIST } from '@/lib/time';

export default function CertificateVerifyPage() {
  const { certificateId } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState<CertificateRecord | null>(null);
  const [integrityOk, setIntegrityOk] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    let active = true;
    const run = async () => {
      const token = searchParams.get('token') || '';
      const all = await v2api.getCertificates();
      const cert = all.find((item) => item.certificate_id === certificateId) || null;
      if (!active) return;
      setCertificate(cert);
      if (!cert) {
        setLoading(false);
        return;
      }
      const validToken = !!token && token === cert.verification_token;
      setTokenValid(validToken);
      setIntegrityOk(await verifyCertificateIntegrity(cert));
      setLoading(false);
    };
    run();
    return () => {
      active = false;
    };
  }, [certificateId, searchParams]);

  const verificationStatus = useMemo(() => {
    if (!certificate) return { label: 'Certificate not found', variant: 'destructive' as const, icon: ShieldAlert };
    if (!tokenValid || !integrityOk) return { label: 'Integrity check failed', variant: 'destructive' as const, icon: ShieldAlert };
    if (certificate.approval_status === 'approved') return { label: 'Approved certificate', variant: 'default' as const, icon: ShieldCheck };
    if (certificate.approval_status === 'revoked') return { label: 'Revoked certificate', variant: 'destructive' as const, icon: ShieldAlert };
    return { label: 'Pending verification', variant: 'secondary' as const, icon: Clock3 };
  }, [certificate, integrityOk, tokenValid]);

  const canPublicDownload = verificationStatus.label === 'Approved certificate';
  const StatusIcon = verificationStatus.icon;

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className="h-5 w-5" /> Certificate Verification Portal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && <p className="text-sm text-muted-foreground">Verifying certificate authenticity…</p>}
          {!loading && (
            <>
              <Badge variant={verificationStatus.variant}>{verificationStatus.label}</Badge>
              {!certificate && <p className="text-sm text-muted-foreground">No certificate matched ID: {certificateId}</p>}
              {certificate && (
                <div className="space-y-2 rounded-xl border p-4">
                  <p className="font-semibold">{certificate.title}</p>
                  <p className="text-sm">Recipient: <span className="font-medium">{certificate.recipient_name}</span></p>
                  <p className="text-sm">Certificate ID: <span className="font-mono">{certificate.certificate_id}</span></p>
                  <p className="text-sm">Issued: {formatInIST(certificate.generated_at)}</p>
                  <p className="text-sm">Approval status: {certificate.approval_status}</p>
                  <p className="text-sm">Token match: {tokenValid ? 'Valid' : 'Invalid'}</p>
                  <p className="text-sm">Tamper hash: {integrityOk ? 'Valid SHA-256 digest' : 'Digest mismatch'}</p>
                  {!canPublicDownload && (
                    <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
                      Downloads are disabled until this certificate reaches approved state.
                    </div>
                  )}
                  <Button size="sm" onClick={() => certificate && downloadCertificatePdf(certificate)} disabled={!canPublicDownload}>
                    <Download className="mr-1 h-3 w-3" /> Download PDF
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

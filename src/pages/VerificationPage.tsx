import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { v2api } from '@/lib/v2api';
import { CertificateRecord, isCertificateAuthentic, normalizeCertificateId } from '@/lib/certificates';

export default function VerificationPage() {
  const [params] = useSearchParams();
  const certificateId = normalizeCertificateId(params.get('certificate_id'));
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);

  useEffect(() => {
    v2api.getCertificates().then(setCertificates);
  }, []);

  const certificate = useMemo(() => certificates.find((item) => normalizeCertificateId(item.id) === certificateId), [certificateId, certificates]);
  const valid = isCertificateAuthentic(certificate);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Certificate Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!certificateId && <p className="text-muted-foreground">Add a certificate id in URL: <span className="font-mono">/verify?certificate_id=XXXX</span>.</p>}
            {certificateId && !certificate && (
              <>
                <Badge variant="destructive">Invalid</Badge>
                <p className="text-sm">No certificate found for <span className="font-mono">{certificateId}</span>.</p>
              </>
            )}
            {certificate && (
              <>
                <Badge variant={valid ? 'default' : 'destructive'}>{valid ? 'Valid' : 'Invalid'}</Badge>
                <div className="grid gap-2 text-sm md:grid-cols-2">
                  <p><span className="font-medium">Certificate ID:</span> <span className="font-mono">{certificate.id}</span></p>
                  <p><span className="font-medium">Type:</span> {certificate.type}</p>
                  <p><span className="font-medium">Recipient:</span> {certificate.recipient_name}</p>
                  <p><span className="font-medium">Recipient Type:</span> {certificate.recipient_type}</p>
                  <p><span className="font-medium">Tournament:</span> {certificate.tournament}</p>
                  <p><span className="font-medium">Season:</span> {certificate.season}</p>
                  <p><span className="font-medium">Status:</span> {certificate.status}</p>
                  <p><span className="font-medium">Certified At:</span> {certificate.certified_at || 'Not certified'}</p>
                  <p><span className="font-medium">Certified By:</span> {certificate.certified_by || 'Unknown'}</p>
                  <p><span className="font-medium">Verification Code:</span> <span className="font-mono">{certificate.verification_code || 'Missing'}</span></p>
                </div>
                {!valid && (
                  <p className="text-sm text-destructive">
                    This certificate record exists, but mandatory certification fields are incomplete.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

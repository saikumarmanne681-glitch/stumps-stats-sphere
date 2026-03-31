import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ShieldAlert, Clock3, Download, Shield, CheckCircle2, AlertTriangle } from 'lucide-react';
import { CertificateRecord } from '@/lib/v2types';
import { v2api } from '@/lib/v2api';
import { resolveCertificateVerificationToken, verifyCertificateIntegrity, withResolvedCertificateSecurity } from '@/lib/certificateSecurity';
import { downloadCertificatePdf } from '@/lib/certificatePdf';
import CertificateArtboard from '@/components/CertificateArtboard';

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
      const normalized = cert ? withResolvedCertificateSecurity(cert) : null;
      setCertificate(normalized);
      if (!cert) { setLoading(false); return; }
      const validToken = !!token && token === resolveCertificateVerificationToken(normalized);
      setTokenValid(validToken);
      setIntegrityOk(await verifyCertificateIntegrity(normalized));
      setLoading(false);
    };
    run();
    return () => { active = false; };
  }, [certificateId, searchParams]);

  const verificationStatus = useMemo(() => {
    if (!certificate) return { label: 'Certificate not found', variant: 'destructive' as const, icon: ShieldAlert };
    if (!tokenValid || !integrityOk) return { label: 'Integrity check failed', variant: 'destructive' as const, icon: ShieldAlert };
    if (certificate.approval_status === 'approved') return { label: 'Verified & Approved', variant: 'default' as const, icon: ShieldCheck };
    if (certificate.approval_status === 'revoked') return { label: 'Revoked', variant: 'destructive' as const, icon: ShieldAlert };
    return { label: 'Pending verification', variant: 'secondary' as const, icon: Clock3 };
  }, [certificate, integrityOk, tokenValid]);

  const canPublicDownload = verificationStatus.label === 'Verified & Approved';
  const StatusIcon = verificationStatus.icon;

  const approvals = useMemo(() => {
    if (!certificate?.approvals_json) return { Treasurer: false, 'Scoring Official': false, 'Match Referee': false };
    try { return JSON.parse(certificate.approvals_json) as Record<string, boolean>; } catch { return { Treasurer: false, 'Scoring Official': false, 'Match Referee': false }; }
  }, [certificate?.approvals_json]);

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="container mx-auto max-w-5xl space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <p className="text-xs font-semibold tracking-[0.4em] text-primary uppercase">Certificate Verification Portal</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground flex items-center justify-center gap-3">
            <StatusIcon className="h-7 w-7" /> Verify Certificate Authenticity
          </h1>
          {!loading && (
            <Badge variant={verificationStatus.variant} className="text-sm px-4 py-1">
              {verificationStatus.label}
            </Badge>
          )}
        </div>

        {loading && <p className="text-center text-sm text-muted-foreground animate-pulse">Verifying certificate authenticity…</p>}

        {!loading && !certificate && (
          <div className="text-center py-12">
            <ShieldAlert className="mx-auto h-12 w-12 text-destructive/50" />
            <p className="mt-4 text-muted-foreground">No certificate matched ID: <span className="font-mono">{certificateId}</span></p>
          </div>
        )}

        {!loading && certificate && (
          <>
            {/* The Certificate */}
            <div className="mx-auto max-w-4xl">
              <CertificateArtboard certificate={certificate} />
            </div>

            {/* Verification Summary Card */}
            <div className="mx-auto max-w-4xl grid gap-4 sm:grid-cols-3">
              {/* Integrity */}
              <div className="rounded-xl border border-border bg-card p-4 text-center">
                <Shield className={`mx-auto h-6 w-6 ${integrityOk ? 'text-primary' : 'text-destructive'}`} />
                <p className="mt-2 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">Hash Integrity</p>
                <p className={`mt-1 text-sm font-bold ${integrityOk ? 'text-primary' : 'text-destructive'}`}>
                  {integrityOk ? 'SHA-256 Verified' : 'Digest Mismatch'}
                </p>
              </div>

              {/* Token */}
              <div className="rounded-xl border border-border bg-card p-4 text-center">
                <Shield className={`mx-auto h-6 w-6 ${tokenValid ? 'text-primary' : 'text-destructive'}`} />
                <p className="mt-2 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">Token Validation</p>
                <p className={`mt-1 text-sm font-bold ${tokenValid ? 'text-primary' : 'text-destructive'}`}>
                  {tokenValid ? 'Valid Token' : 'Invalid/Missing'}
                </p>
              </div>

              {/* Approval Chain */}
              <div className="rounded-xl border border-border bg-card p-4 text-center">
                <Shield className={`mx-auto h-6 w-6 ${canPublicDownload ? 'text-primary' : 'text-accent'}`} />
                <p className="mt-2 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">Approvals</p>
                <div className="mt-1 flex items-center justify-center gap-2">
                  {Object.entries(approvals).map(([role, ok]) => (
                    <span key={role} title={role} className="inline-flex">
                      {ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertTriangle className="h-4 w-4 text-accent" />}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Download */}
            <div className="text-center space-y-3">
              {!canPublicDownload && (
                <p className="text-xs text-muted-foreground">
                  PDF download is available only for fully approved and verified certificates.
                </p>
              )}
              <Button onClick={() => certificate && downloadCertificatePdf(certificate)} disabled={!canPublicDownload}>
                <Download className="mr-2 h-4 w-4" /> Download Official PDF
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

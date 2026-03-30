import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ShieldAlert, Clock3, Download, Fingerprint, Shield, QrCode, CheckCircle2, AlertTriangle, FileCheck2 } from 'lucide-react';
import { CertificateRecord } from '@/lib/v2types';
import { v2api } from '@/lib/v2api';
import { resolveCertificateVerificationToken, verifyCertificateIntegrity, withResolvedCertificateSecurity } from '@/lib/certificateSecurity';
import { downloadCertificatePdf } from '@/lib/certificatePdf';
import { formatInIST } from '@/lib/time';
import { QRCodeSVG } from 'qrcode.react';
import { DataIntegrityBadge, SecurityShieldBadge, SessionFingerprint, EncryptedLine, SecurityWatermark } from '@/components/SecurityBadge';

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
      if (!cert) {
        setLoading(false);
        return;
      }
      const validToken = !!token && token === resolveCertificateVerificationToken(normalized);
      setTokenValid(validToken);
      setIntegrityOk(await verifyCertificateIntegrity(normalized));
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
  const approvals = useMemo(() => {
    if (!certificate?.approvals_json) return { Treasurer: false, 'Scoring Official': false, 'Match Referee': false };
    try {
      return JSON.parse(certificate.approvals_json) as Record<'Treasurer' | 'Scoring Official' | 'Match Referee', boolean>;
    } catch {
      return { Treasurer: false, 'Scoring Official': false, 'Match Referee': false };
    }
  }, [certificate?.approvals_json]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-8">
      <SecurityWatermark />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--accent)/0.12),transparent_34%),linear-gradient(135deg,hsl(var(--primary)/0.05),transparent_45%)]" aria-hidden="true" />
      <div className="relative container mx-auto max-w-6xl space-y-6">
        <section className="admin-section-shell relative overflow-hidden px-6 py-8">
          <div className="pointer-events-none absolute inset-0 soft-dot-grid opacity-60" aria-hidden="true" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <SecurityShieldBadge label="Authenticity Portal" variant={tokenValid && integrityOk ? 'certified' : 'encrypted'} />
                <SecurityShieldBadge label="Tamper Evident" variant="default" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">Certificate verification</p>
                <h1 className="section-heading mt-2 flex items-center gap-3 text-4xl sm:text-5xl">
                  <StatusIcon className="h-8 w-8" /> Verify league certificate authenticity
                </h1>
                <p className="mt-4 max-w-2xl text-base text-muted-foreground">Premium verification view with visible approval tracking, semi-visible security cues, QR validation, and direct authenticity link inspection.</p>
              </div>
            </div>
            <div className="grid gap-3 rounded-[1.5rem] border border-primary/15 bg-card/85 p-4 shadow-sm sm:grid-cols-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Session trace</p>
                <div className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground"><Fingerprint className="h-4 w-4 text-primary" /> <SessionFingerprint /></div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Cipher band</p>
                <div className="mt-2"><EncryptedLine lines={3} /></div>
              </div>
            </div>
          </div>
        </section>

        <Card className="overflow-hidden border-primary/15 shadow-[0_24px_80px_-48px_hsl(var(--foreground)/0.5)]">
          <CardHeader className="border-b border-border/70 bg-gradient-to-r from-card via-background to-primary/5">
            <CardTitle className="flex flex-wrap items-center gap-3">
              <StatusIcon className="h-5 w-5" /> Certificate Verification Portal
              {!loading && <Badge variant={verificationStatus.variant}>{verificationStatus.label}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
          {loading && <p className="text-sm text-muted-foreground">Verifying certificate authenticity…</p>}
          {!loading && (
            <>
              {!certificate && <p className="text-sm text-muted-foreground">No certificate matched ID: {certificateId}</p>}
              {certificate && (
                <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
                  <article className="relative overflow-hidden rounded-[2rem] border border-primary/15 bg-gradient-to-br from-card via-background to-accent/10 p-6">
                    <div className="pointer-events-none absolute inset-0 soft-dot-grid opacity-50" aria-hidden="true" />
                    <div className="relative">
                      <div className="flex flex-wrap items-center gap-2">
                        <SecurityShieldBadge label={certificate.approval_status === 'approved' ? 'Officially Certified' : 'Under Review'} variant={certificate.approval_status === 'approved' ? 'certified' : 'default'} />
                        <DataIntegrityBadge data={`${certificate.certificate_id}|${certificate.security_hash}|${certificate.generated_at}`} label="Certificate integrity string" />
                      </div>
                      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-primary">Official certificate record</p>
                      <h2 className="mt-3 font-display text-3xl tracking-wide text-foreground">{certificate.title}</h2>
                      <p className="mt-5 text-sm uppercase tracking-[0.3em] text-muted-foreground">Presented to</p>
                      <p className="mt-2 font-display text-4xl text-primary">{certificate.recipient_name}</p>
                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-border bg-card/90 p-4">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Certificate ID</p>
                          <p className="mt-1 font-mono text-sm text-foreground">{certificate.certificate_id}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-card/90 p-4">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Issued</p>
                          <p className="mt-1 text-sm font-medium text-foreground">{formatInIST(certificate.generated_at)}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-card/90 p-4">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Token validation</p>
                          <p className="mt-1 text-sm font-medium text-foreground">{tokenValid ? 'Valid token match' : 'Invalid or missing token'}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-card/90 p-4">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Tamper hash</p>
                          <p className="mt-1 text-sm font-medium text-foreground">{integrityOk ? 'Verified SHA-256 digest' : 'Digest mismatch detected'}</p>
                        </div>
                      </div>
                      <div className="mt-6 rounded-[1.5rem] border border-primary/15 bg-card/75 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Shield className="h-4 w-4 text-primary" /> Approval chain</div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          {(Object.entries(approvals) as Array<[keyof typeof approvals, boolean]>).map(([role, approved]) => (
                            <div key={role} className="rounded-2xl border border-border bg-background/80 p-3">
                              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{role}</p>
                              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-foreground">{approved ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertTriangle className="h-4 w-4 text-accent" />}{approved ? 'Approved' : 'Awaiting'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>

                  <aside className="space-y-4">
                    <div className="rounded-[2rem] border border-primary/15 bg-card p-5 text-center shadow-sm">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><QrCode className="h-5 w-5" /></div>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.3em] text-primary">Verification QR</p>
                      <QRCodeSVG value={certificate.verification_url || certificate.qr_payload} size={152} className="mx-auto mt-4 rounded-xl bg-white p-3" />
                      <p className="mt-3 break-all text-[11px] text-muted-foreground">{certificate.verification_url || certificate.qr_payload}</p>
                    </div>

                    <div className="rounded-[2rem] border border-primary/15 bg-gradient-to-b from-card to-muted/50 p-5 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><FileCheck2 className="h-4 w-4 text-primary" /> Authenticity reference</div>
                      <div className="mt-4 space-y-3 text-sm">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Approval status</p>
                          <p className="mt-1 font-medium text-foreground">{certificate.approval_status.replace('_', ' ')}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Verification URL</p>
                          <p className="mt-1 break-all font-mono text-[11px] text-foreground">{certificate.verification_url || certificate.qr_payload}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Security hash</p>
                          <p className="mt-1 break-all font-mono text-[11px] text-foreground">{certificate.security_hash}</p>
                        </div>
                      </div>
                    </div>
                  </aside>
                </div>
              )}
              {certificate && !canPublicDownload && (
                <div className="rounded-xl border border-accent/40 bg-accent/10 p-3 text-xs text-foreground">
                  Downloads are disabled until this certificate reaches approved state and passes verification checks.
                </div>
              )}
              {certificate && (
                <div className="flex flex-wrap gap-3">
                  <Button size="sm" onClick={() => certificate && downloadCertificatePdf(certificate)} disabled={!canPublicDownload}>
                    <Download className="mr-1 h-3 w-3" /> Download PDF
                  </Button>
                </div>
              )}
            </>
          )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { v2api } from '@/lib/v2api';
import { getVerificationConfidenceMode, verifyScorelist } from '@/lib/scorelist';
import { CertificationApproval, DigitalScorelist } from '@/lib/v2types';
import { ArrowLeft, ShieldCheck, ShieldX, Loader2 } from 'lucide-react';

const confidenceStyleMap: Record<string, string> = {
  server_signed: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/40',
  crypto_verified: 'bg-blue-500/15 text-blue-700 border-blue-500/40',
  legacy_mode: 'bg-amber-500/20 text-amber-700 border-amber-500/40',
  unverified: 'bg-destructive/10 text-destructive border-destructive/40',
};

const confidenceLabelMap: Record<string, string> = {
  server_signed: 'Server-Signed',
  crypto_verified: 'Cryptographically Verified',
  legacy_mode: 'Legacy Mode',
  unverified: 'Unverified',
};

const VerifyScorelist = () => {
  const { id } = useParams();
  const location = useLocation();
  const decodedId = useMemo(() => {
    if (!id) return '';
    try {
      return decodeURIComponent(id);
    } catch {
      return id;
    }
  }, [id]);
  const [scorelist, setScorelist] = useState<DigitalScorelist | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; reason?: string } | null>(null);
  const [confidenceMode, setConfidenceMode] = useState<'server_signed' | 'crypto_verified' | 'legacy_mode' | 'unverified'>('unverified');
  const [verifying, setVerifying] = useState(false);
  const [stages, setStages] = useState<string[]>([]);
  const [signerChain, setSignerChain] = useState<CertificationApproval[]>([]);
  const verifyUrlMeta = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const exp = Number(params.get('exp') || 0);
    const nonce = params.get('nonce') || '';
    const sv = params.get('sv') || '';
    return { exp, nonce, sv, isExpired: !!exp && Date.now() > exp };
  }, [location.search]);

  useEffect(() => {
    (async () => {
      const all = await v2api.getScorelists();
      const found = all.find(s => s.scorelist_id === decodedId);
      setScorelist(found || null);
      setLoading(false);
      
      if (found) {
        setVerifying(true);
        // Simulate staged verification
        setStages(['Fetching document...']);
        await new Promise(r => setTimeout(r, 500));
        setStages(prev => [...prev, 'Computing hash digest...']);
        await new Promise(r => setTimeout(r, 500));
        setStages(prev => [...prev, 'Validating signature...']);
        await new Promise(r => setTimeout(r, 500));
        const result = await verifyScorelist(found);
        const confidence = await getVerificationConfidenceMode(found);
        setStages(prev => [...prev, 'Comparing integrity...']);
        await new Promise(r => setTimeout(r, 300));
        setVerifyResult(result);
        setConfidenceMode(confidence);
        try {
          const parsed = JSON.parse(found.certifications_json || '[]');
          setSignerChain(Array.isArray(parsed) ? parsed : []);
        } catch {
          setSignerChain([]);
        }
        setStages(prev => [...prev, result.valid ? '✅ Verification complete' : '❌ Verification failed']);
        setVerifying(false);
      }
    })();
  }, [decodedId]);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!scorelist) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-20 text-center">
        <ShieldX className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h1 className="font-display text-3xl mb-2">Scorelist Not Found</h1>
        <p className="text-muted-foreground mb-4">The document ID "{decodedId || id}" does not exist.</p>
        <Button asChild><Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Home</Link></Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <Button variant="ghost" size="sm" asChild><Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>

        <Card className={`border-2 ${verifyResult?.valid ? 'border-primary bg-primary/5' : verifyResult ? 'border-destructive bg-destructive/5' : 'border-border'}`}>
          <CardContent className="p-8 text-center space-y-4">
            {verifying ? (
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            ) : verifyResult?.valid ? (
              <ShieldCheck className="h-16 w-16 text-primary mx-auto" />
            ) : (
              <ShieldX className="h-16 w-16 text-destructive mx-auto" />
            )}

            <h1 className="font-display text-2xl font-bold">
              {verifying ? 'Verifying...' : verifyResult?.valid ? '✔ Authentic Scorelist' : '❌ Tampered Document'}
            </h1>
            {!verifying && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Badge variant="outline" className={confidenceStyleMap[confidenceMode]}>
                  {confidenceLabelMap[confidenceMode] || 'Unverified'}
                </Badge>
                <Badge variant="outline">{scorelist.security_version || 'SEC-v2 (legacy)'}</Badge>
              </div>
            )}

            {verifyResult && !verifyResult.valid && (
              <p className="text-destructive font-medium">{verifyResult.reason}</p>
            )}
            {verifyResult?.valid && confidenceMode !== 'server_signed' && (
              <p className="text-xs text-amber-700 bg-amber-500/10 border border-amber-500/30 rounded px-3 py-2">
                This verifies integrity only, not identity.
              </p>
            )}
            {verifyResult?.valid && confidenceMode === 'server_signed' && (
              <p className="text-xs text-emerald-700 bg-emerald-500/10 border border-emerald-500/30 rounded px-3 py-2">
                Integrity + signer attestation validated.
              </p>
            )}

            <div className="text-left space-y-2 mt-6">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Document ID:</span><span className="font-mono text-xs">{scorelist.scorelist_id}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Scope:</span><Badge variant="outline">{scorelist.scope_type}</Badge></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Generated:</span><span>{scorelist.generated_at}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Generated By:</span><span>{scorelist.generated_by}</span></div>
              <div className="text-sm"><span className="text-muted-foreground">Hash:</span><p className="font-mono text-xs break-all mt-1">{scorelist.hash_digest}</p></div>
            </div>

            <div className="w-full text-left mt-4 rounded-md border p-3 bg-muted/20">
              <p className="text-sm font-semibold mb-2">Tamper Timeline</p>
              <div className="space-y-1 text-xs">
                <p>Issued at: <span className="font-medium">{scorelist.generated_at || 'Unknown'}</span></p>
                <p>Status: <span className={verifyResult?.valid ? 'text-primary font-semibold' : 'text-destructive font-semibold'}>
                  {verifyResult?.valid ? 'No tamper detected since issuance' : 'Hash changed since issuance'}
                </span></p>
                <p>Latest verification run: <span className="font-medium">{new Date().toISOString()}</span></p>
                {verifyUrlMeta.exp ? (
                  <p>QR link state: <span className={verifyUrlMeta.isExpired ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                    {verifyUrlMeta.isExpired ? 'Expired short-lived link' : 'Active short-lived link'}
                  </span></p>
                ) : null}
                {verifyUrlMeta.nonce ? <p>Nonce: <span className="font-mono">{verifyUrlMeta.nonce}</span></p> : null}
                {verifyUrlMeta.sv ? <p>Link security stamp: <span className="font-medium">{verifyUrlMeta.sv}</span></p> : null}
              </div>
            </div>

            <div className="w-full text-left mt-4 rounded-md border p-3 bg-muted/20">
              <p className="text-sm font-semibold mb-2">Signer Chain</p>
              {signerChain.length === 0 ? (
                <p className="text-xs text-muted-foreground">No signer entries recorded for this scorelist yet.</p>
              ) : (
                <div className="space-y-2 max-h-44 overflow-auto pr-1">
                  {signerChain.map((signer, index) => (
                    <div key={`${signer.approver_id}-${index}`} className="rounded border bg-background px-2 py-1.5 text-xs">
                      <p className="font-medium">{signer.approver_name} • {signer.designation}</p>
                      <p className="text-muted-foreground">Stage: {signer.stage} • Time: {signer.timestamp}</p>
                      <p className="font-mono text-[10px]">Token: {signer.token || 'N/A'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Verification Stages */}
            <div className="text-left mt-6 space-y-1">
              <p className="text-sm font-semibold mb-2">Verification Steps:</p>
              {stages.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className={i === stages.length - 1 && !verifying ? (verifyResult?.valid ? 'text-primary' : 'text-destructive') : 'text-muted-foreground'}>
                    {i < stages.length - 1 || !verifying ? '✓' : '⏳'}
                  </span>
                  <span>{s}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground mt-4 italic">
              Official League Record • Tampering Invalidates Document
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyScorelist;

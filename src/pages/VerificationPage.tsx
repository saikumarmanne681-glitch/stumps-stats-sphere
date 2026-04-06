import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { v2api } from '@/lib/v2api';
import { CertificateRecord, isCertificateAuthentic, normalizeCertificateId } from '@/lib/certificates';
import { DigitalScorelist } from '@/lib/v2types';
import { verifyScorelist } from '@/lib/scorelist';
import { Camera, Loader2, Search, ShieldCheck, ShieldX } from 'lucide-react';

type VerifyMode = 'certificate' | 'scorelist';

type VerificationState =
  | { kind: 'idle' }
  | { kind: 'not_found'; mode: VerifyMode; value: string }
  | { kind: 'certificate'; valid: boolean; item: CertificateRecord }
  | { kind: 'scorelist'; valid: boolean; item: DigitalScorelist; reason?: string };

const parseVerificationInput = (value: string, fallbackMode: VerifyMode): { mode: VerifyMode; id: string } | null => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const certificateId = normalizeCertificateId(url.searchParams.get('certificate_id'));
    if (certificateId) return { mode: 'certificate', id: certificateId };
    const path = url.pathname.replace(/\/+$/, '');
    const parts = path.split('/').filter(Boolean);
    const tail = decodeURIComponent(parts[parts.length - 1] || '');
    if (path.includes('/verify-scorelist/') || path.includes('/verify/scorelist/')) {
      return { mode: 'scorelist', id: tail };
    }
    if (path.includes('/verify/certificate/')) {
      return { mode: 'certificate', id: normalizeCertificateId(tail) };
    }
  } catch {
    // not a URL; treated as raw id below
  }

  if (fallbackMode === 'certificate') {
    return { mode: 'certificate', id: normalizeCertificateId(raw) };
  }
  return { mode: 'scorelist', id: raw };
};

export default function VerificationPage() {
  const [params] = useSearchParams();
  const routeParams = useParams<{ type?: string; id?: string }>();
  const [mode, setMode] = useState<VerifyMode>('certificate');
  const [inputValue, setInputValue] = useState('');
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [scorelists, setScorelists] = useState<DigitalScorelist[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerificationState>({ kind: 'idle' });
  const [scannerMessage, setScannerMessage] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerBusy, setScannerBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerIntervalRef = useRef<number | null>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [certRows, scoreRows] = await Promise.all([v2api.getCertificates(), v2api.getScorelists()]);
      if (cancelled) return;
      setCertificates(certRows);
      setScorelists(scoreRows);
      setLoadingData(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const explicitType = routeParams.type === 'scorelist' ? 'scorelist' : routeParams.type === 'certificate' ? 'certificate' : null;
    const explicitId = routeParams.id ? decodeURIComponent(routeParams.id) : '';
    const certificateIdFromQuery = normalizeCertificateId(params.get('certificate_id'));
    const scorelistIdFromQuery = params.get('scorelist_id') || '';

    if (explicitType && explicitId) {
      setMode(explicitType);
      setInputValue(explicitId);
      return;
    }
    if (certificateIdFromQuery) {
      setMode('certificate');
      setInputValue(certificateIdFromQuery);
      return;
    }
    if (scorelistIdFromQuery) {
      setMode('scorelist');
      setInputValue(scorelistIdFromQuery);
    }
  }, [params, routeParams.id, routeParams.type]);

  useEffect(() => {
    return () => {
      if (scannerIntervalRef.current) window.clearInterval(scannerIntervalRef.current);
      scannerStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const certificate = useMemo(() => {
    if (result.kind !== 'certificate') return null;
    return result.item;
  }, [result]);

  const runVerification = async (value: string, selectedMode: VerifyMode): Promise<boolean> => {
    const parsed = parseVerificationInput(value, selectedMode);
    if (!parsed?.id) {
      setResult({ kind: 'idle' });
      return false;
    }

    setVerifying(true);
    try {
      if (parsed.mode === 'certificate') {
        const id = normalizeCertificateId(parsed.id);
        const found = certificates.find((item) => normalizeCertificateId(item.id) === id);
        if (!found) {
          setResult({ kind: 'not_found', mode: 'certificate', value: id });
          return false;
        }
        setResult({ kind: 'certificate', valid: isCertificateAuthentic(found), item: found });
        return true;
      }

      const scorelistId = String(parsed.id || '').trim();
      const found = scorelists.find((item) => String(item.scorelist_id || '').trim() === scorelistId);
      if (!found) {
        setResult({ kind: 'not_found', mode: 'scorelist', value: scorelistId });
        return false;
      }
      const verifyResult = await verifyScorelist(found);
      setResult({ kind: 'scorelist', valid: verifyResult.valid, reason: verifyResult.reason, item: found });
      return true;
    } finally {
      setVerifying(false);
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const isSuccess = await runVerification(inputValue, mode);
    if (isSuccess) {
      setInputValue('');
    }
  };

  const startScanner = async () => {
    setScannerMessage('');
    setScannerOpen(true);

    const BarcodeDetectorCtor = (window as Window & { BarcodeDetector?: new (...args: any[]) => { detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>> } }).BarcodeDetector;
    if (!BarcodeDetectorCtor) {
      setScannerMessage('Scanner is not supported in this browser. Please paste verification URL or ID.');
      return;
    }

    try {
      setScannerBusy(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      scannerStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
      scannerIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || verifying) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          const value = String(barcodes[0]?.rawValue || '').trim();
          if (!value) return;
          setInputValue(value);
          setScannerMessage('QR detected. Verifying now...');
          if (scannerIntervalRef.current) {
            window.clearInterval(scannerIntervalRef.current);
            scannerIntervalRef.current = null;
          }
          scannerStreamRef.current?.getTracks().forEach((track) => track.stop());
          scannerStreamRef.current = null;
          setScannerBusy(false);
          const isSuccess = await runVerification(value, mode);
          if (isSuccess) {
            setInputValue('');
          }
        } catch {
          // keep trying until qr is found
        }
      }, 700);
    } catch {
      setScannerMessage('Unable to access camera. Check permission and use URL/ID verification instead.');
      setScannerBusy(false);
    }
  };

  const stopScanner = () => {
    if (scannerIntervalRef.current) {
      window.clearInterval(scannerIntervalRef.current);
      scannerIntervalRef.current = null;
    }
    scannerStreamRef.current?.getTracks().forEach((track) => track.stop());
    scannerStreamRef.current = null;
    setScannerBusy(false);
    setScannerOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Public Verification Portal</CardTitle>
            <CardDescription>
              No login required. Verify both digital scorelists and certificates using scanner, URL, or direct ID.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={mode} onValueChange={(value) => setMode(value as VerifyMode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="certificate">Certificate</TabsTrigger>
                <TabsTrigger value="scorelist">Digital Scorelist</TabsTrigger>
              </TabsList>
              <TabsContent value="certificate" />
              <TabsContent value="scorelist" />
            </Tabs>

            <form onSubmit={onSubmit} className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="verify-input">
                  {mode === 'certificate' ? 'Certificate URL / Certificate ID' : 'Scorelist URL / Scorelist ID'}
                </Label>
                <Input
                  id="verify-input"
                  placeholder={mode === 'certificate' ? 'Example: /verify?certificate_id=CERT-1001' : 'Example: /verify-scorelist/DS-1001'}
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={loadingData || verifying}>
                  {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Verify
                </Button>
                <Button type="button" variant="outline" onClick={startScanner}>
                  <Camera className="mr-2 h-4 w-4" /> Scan QR
                </Button>
              </div>
            </form>

            {scannerOpen && (
              <Card className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">QR Scanner</CardTitle>
                  <CardDescription>Point your camera at a verification QR code.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <video ref={videoRef} className="w-full rounded-md border bg-black/90" muted playsInline />
                  {scannerMessage && <p className="text-sm text-muted-foreground">{scannerMessage}</p>}
                  <Button type="button" variant="secondary" onClick={stopScanner} disabled={!scannerBusy && !scannerMessage}>
                    Close scanner
                  </Button>
                </CardContent>
              </Card>
            )}

            {loadingData && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading verification records...
              </div>
            )}

            {result.kind === 'not_found' && (
              <Card className="border-destructive/40 bg-destructive/5">
                <CardContent className="pt-6">
                  <Badge variant="destructive">Not Found</Badge>
                  <p className="mt-2 text-sm">
                    No {result.mode} found for <span className="font-mono">{result.value}</span>.
                  </p>
                </CardContent>
              </Card>
            )}

            {certificate && result.kind === 'certificate' && (
              <Card className={result.valid ? 'border-primary/40 bg-primary/5' : 'border-destructive/40 bg-destructive/5'}>
                <CardContent className="space-y-3 pt-6">
                  <Badge variant={result.valid ? 'default' : 'destructive'} className="inline-flex items-center gap-1">
                    {result.valid ? <ShieldCheck className="h-3 w-3" /> : <ShieldX className="h-3 w-3" />}
                    {result.valid ? 'Valid Certificate' : 'Invalid Certificate'}
                  </Badge>
                  <div className="grid gap-2 text-sm md:grid-cols-2">
                    <p><span className="font-medium">Certificate ID:</span> <span className="font-mono">{certificate.id}</span></p>
                    <p><span className="font-medium">Recipient:</span> {certificate.recipient_name}</p>
                    <p><span className="font-medium">Type:</span> {certificate.type}</p>
                    <p><span className="font-medium">Tournament:</span> {certificate.tournament}</p>
                    <p><span className="font-medium">Season:</span> {certificate.season}</p>
                    <p><span className="font-medium">Status:</span> {certificate.status}</p>
                    <p><span className="font-medium">Certified At:</span> {certificate.certified_at || 'Not certified'}</p>
                    <p><span className="font-medium">Certified By:</span> {certificate.certified_by || 'Unknown'}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {result.kind === 'scorelist' && (
              <Card className={result.valid ? 'border-primary/40 bg-primary/5' : 'border-destructive/40 bg-destructive/5'}>
                <CardContent className="space-y-3 pt-6">
                  <Badge variant={result.valid ? 'default' : 'destructive'} className="inline-flex items-center gap-1">
                    {result.valid ? <ShieldCheck className="h-3 w-3" /> : <ShieldX className="h-3 w-3" />}
                    {result.valid ? 'Authentic Scorelist' : 'Tampered / Invalid Scorelist'}
                  </Badge>
                  {result.reason && <p className="text-sm text-destructive">{result.reason}</p>}
                  <div className="grid gap-2 text-sm md:grid-cols-2">
                    <p><span className="font-medium">Scorelist ID:</span> <span className="font-mono">{result.item.scorelist_id}</span></p>
                    <p><span className="font-medium">Scope:</span> {result.item.scope_type}</p>
                    <p><span className="font-medium">Generated By:</span> {result.item.generated_by}</p>
                    <p><span className="font-medium">Generated At:</span> {result.item.generated_at}</p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/verify-scorelist/${encodeURIComponent(result.item.scorelist_id)}`}>
                      Open full scorelist verification page
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

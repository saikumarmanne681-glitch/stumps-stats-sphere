import { CertificateRecord } from './v2types';

export type CertificateSignatureRecord = {
  role: 'Treasurer' | 'Scoring Official' | 'Match Referee';
  signerId: string;
  signerName: string;
  signedAt: string;
};

export function buildCertificateVerificationUrl(certificateId: string, token: string) {
  if (typeof window === 'undefined') return `/verify-certificate/${certificateId}?token=${encodeURIComponent(token)}`;
  return `${window.location.origin}/verify-certificate/${certificateId}?token=${encodeURIComponent(token)}`;
}

export function canonicalCertificatePayload(input: {
  certificate_id: string;
  certificate_type: string;
  recipient_id: string;
  recipient_name: string;
  season_id: string;
  tournament_id: string;
  match_id: string;
  generated_at: string;
  verification_token: string;
}) {
  return [
    input.certificate_id.trim(),
    input.certificate_type.trim(),
    input.recipient_id.trim(),
    input.recipient_name.trim(),
    input.season_id.trim(),
    input.tournament_id.trim(),
    input.match_id.trim(),
    input.generated_at.trim(),
    input.verification_token.trim(),
  ].join('|');
}

export function createVerificationToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const digestBytes = new Uint8Array(digest);
  return Array.from(digestBytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createCertificateDigest(input: Parameters<typeof canonicalCertificatePayload>[0]) {
  return sha256Hex(canonicalCertificatePayload(input));
}

export async function verifyCertificateIntegrity(item: CertificateRecord) {
  const canonical = canonicalCertificatePayload({
    certificate_id: item.certificate_id,
    certificate_type: item.certificate_type,
    recipient_id: item.recipient_id,
    recipient_name: item.recipient_name,
    season_id: item.season_id,
    tournament_id: item.tournament_id,
    match_id: item.match_id || '',
    generated_at: item.generated_at,
    verification_token: item.verification_token || '',
  });
  const digest = await sha256Hex(canonical);
  const payloadMatchesCanonical = (() => {
    try {
      const parsed = JSON.parse(item.tamper_evident_payload || '{}') as Record<string, string>;
      return canonical === canonicalCertificatePayload({
        certificate_id: parsed.certificate_id || '',
        certificate_type: parsed.certificate_type || '',
        recipient_id: item.recipient_id,
        recipient_name: parsed.recipient_name || '',
        season_id: parsed.season_id || '',
        tournament_id: parsed.tournament_id || '',
        match_id: parsed.match_id || '',
        generated_at: parsed.generated_at || '',
        verification_token: parsed.verification_token || '',
      });
    } catch {
      return false;
    }
  })();
  return digest === item.security_hash && payloadMatchesCanonical;
}

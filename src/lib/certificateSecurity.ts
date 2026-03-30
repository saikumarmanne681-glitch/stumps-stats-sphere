import { CertificateRecord } from './v2types';

export type CertificateSignatureRecord = {
  role: 'Treasurer' | 'Scoring Official' | 'Match Referee';
  signerId: string;
  signerName: string;
  signedAt: string;
};

type CertificateSecuritySource = Pick<CertificateRecord, 'certificate_id' | 'certificate_type' | 'recipient_id' | 'recipient_name' | 'season_id' | 'tournament_id' | 'match_id' | 'generated_at' | 'verification_token' | 'verification_url' | 'qr_payload' | 'tamper_evident_payload' | 'approvals_json' | 'signatures_json' | 'security_hash' | 'certificate_template' | 'title' | 'recipient_type' | 'approval_status' | 'metadata_json' | 'certificate_html' | 'generated_by' | 'approved_at' | 'delivery_status'>;

export function buildCertificateVerificationUrl(certificateId: string, token: string) {
  if (typeof window === 'undefined') return `/verify-certificate/${certificateId}?token=${encodeURIComponent(token)}`;
  return `${window.location.origin}/verify-certificate/${certificateId}?token=${encodeURIComponent(token)}`;
}

function readTokenFromUrl(urlLike: string) {
  const safe = String(urlLike || '').trim();
  if (!safe) return '';
  try {
    const url = typeof window === 'undefined'
      ? new URL(safe, 'https://certificate.local')
      : new URL(safe, window.location.origin);
    return url.searchParams.get('token') || '';
  } catch {
    const match = safe.match(/[?&]token=([^&]+)/i);
    return match ? decodeURIComponent(match[1]) : '';
  }
}

export function resolveCertificateVerificationToken(item: Pick<CertificateRecord, 'verification_token' | 'verification_url' | 'qr_payload'>) {
  return String(item.verification_token || '').trim()
    || readTokenFromUrl(String(item.verification_url || ''))
    || readTokenFromUrl(String(item.qr_payload || ''));
}

export function resolveCertificateVerificationUrl(item: Pick<CertificateRecord, 'certificate_id' | 'verification_url' | 'qr_payload' | 'verification_token'>) {
  const directUrl = String(item.verification_url || '').trim() || String(item.qr_payload || '').trim();
  if (directUrl) return directUrl;
  const token = resolveCertificateVerificationToken(item);
  return buildCertificateVerificationUrl(item.certificate_id, token);
}

export function buildCertificateTamperEvidentPayload(input: {
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
  return JSON.stringify({
    certificate_id: input.certificate_id,
    certificate_type: input.certificate_type,
    recipient_id: input.recipient_id,
    recipient_name: input.recipient_name,
    season_id: input.season_id,
    tournament_id: input.tournament_id,
    match_id: input.match_id,
    generated_at: input.generated_at,
    verification_token: input.verification_token,
  });
}

export function withResolvedCertificateSecurity(item: CertificateSecuritySource): CertificateRecord {
  const verification_token = resolveCertificateVerificationToken(item);
  const verification_url = resolveCertificateVerificationUrl({
    certificate_id: item.certificate_id,
    verification_url: item.verification_url,
    qr_payload: item.qr_payload,
    verification_token,
  });

  return {
    ...item,
    certificate_template: item.certificate_template || 'classic',
    qr_payload: String(item.qr_payload || '').trim() || verification_url,
    verification_url,
    verification_token,
    tamper_evident_payload: String(item.tamper_evident_payload || '').trim() || buildCertificateTamperEvidentPayload({
      certificate_id: item.certificate_id,
      certificate_type: item.certificate_type,
      recipient_id: item.recipient_id,
      recipient_name: item.recipient_name,
      season_id: item.season_id,
      tournament_id: item.tournament_id,
      match_id: item.match_id || '',
      generated_at: item.generated_at,
      verification_token,
    }),
    approvals_json: String(item.approvals_json || '').trim() || JSON.stringify({ Treasurer: false, 'Scoring Official': false, 'Match Referee': false }),
    signatures_json: String(item.signatures_json || '').trim() || '[]',
  };
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
  const normalized = withResolvedCertificateSecurity(item);
  const canonical = canonicalCertificatePayload({
    certificate_id: normalized.certificate_id,
    certificate_type: normalized.certificate_type,
    recipient_id: normalized.recipient_id,
    recipient_name: normalized.recipient_name,
    season_id: normalized.season_id,
    tournament_id: normalized.tournament_id,
    match_id: normalized.match_id || '',
    generated_at: normalized.generated_at,
    verification_token: normalized.verification_token || '',
  });
  const digest = await sha256Hex(canonical);
  const payloadMatchesCanonical = (() => {
    try {
      const parsed = JSON.parse(normalized.tamper_evident_payload || '{}') as Record<string, string>;
      return canonical === canonicalCertificatePayload({
        certificate_id: parsed.certificate_id || normalized.certificate_id,
        certificate_type: parsed.certificate_type || normalized.certificate_type,
        recipient_id: parsed.recipient_id || normalized.recipient_id,
        recipient_name: parsed.recipient_name || normalized.recipient_name,
        season_id: parsed.season_id || normalized.season_id,
        tournament_id: parsed.tournament_id || normalized.tournament_id,
        match_id: parsed.match_id || normalized.match_id || '',
        generated_at: parsed.generated_at || normalized.generated_at,
        verification_token: parsed.verification_token || normalized.verification_token || '',
      });
    } catch {
      return false;
    }
  })();
  return digest === normalized.security_hash && payloadMatchesCanonical;
}

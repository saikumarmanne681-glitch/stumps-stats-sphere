import { describe, expect, it } from 'vitest';
import { isCertificateAuthentic, isCertificateCertified, normalizeCertificateId } from '@/lib/certificates';

describe('certificate verification helpers', () => {
  it('normalizes ids for resilient lookup', () => {
    expect(normalizeCertificateId(' cert-001 ')).toBe('CERT-001');
    expect(normalizeCertificateId('')).toBe('');
  });

  it('treats certified status case-insensitively', () => {
    expect(isCertificateCertified({ status: 'CERTIFIED' })).toBe(true);
    expect(isCertificateCertified({ status: 'certified' as never })).toBe(true);
    expect(isCertificateCertified({ status: 'APPROVED' })).toBe(false);
  });

  it('requires all mandatory fields for authenticity', () => {
    expect(isCertificateAuthentic({
      status: 'CERTIFIED',
      certified_at: '2026-04-01T11:30:00.000Z',
      certified_by: 'admin',
      verification_code: 'VERIFY-ABC123',
    })).toBe(true);

    expect(isCertificateAuthentic({
      status: 'CERTIFIED',
      certified_at: '2026-04-01T11:30:00.000Z',
      certified_by: 'admin',
      verification_code: '',
    })).toBe(false);
  });
});

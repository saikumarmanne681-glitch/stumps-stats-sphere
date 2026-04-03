import { describe, expect, it } from 'vitest';
import { certificateMatchesPlayer, certificateMatchesTeam, isCertificateAuthentic, isCertificateCertified, normalizeCertificateId, normalizeCertificateRecord } from '@/lib/certificates';

describe('certificate verification helpers', () => {
  it('normalizes ids for resilient lookup', () => {
    expect(normalizeCertificateId(' cert-001 ')).toBe('CERT-001');
    expect(normalizeCertificateId('')).toBe('');
  });

  it('treats certified status case-insensitively', () => {
    expect(isCertificateCertified({ status: 'CERTIFIED' })).toBe(true);
    expect(isCertificateCertified({ status: 'certified' as never })).toBe(true);
    expect(isCertificateCertified({ status: 'Certificate Certified' as never })).toBe(true);
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

  it('maps legacy certification status columns to CERTIFIED', () => {
    expect(normalizeCertificateRecord({
      id: 'CERT-LEGACY-1',
      approval_status: 'certified',
      recipient_name: 'Legacy Recipient',
    }).status).toBe('CERTIFIED');
  });

  it('matches players and teams even with id/name formatting differences', () => {
    expect(certificateMatchesPlayer({
      recipient_type: 'player',
      recipient_id: 'PLR-001',
      linked_player_id: '',
    }, 'plr 001')).toBe(true);

    expect(certificateMatchesTeam({
      recipient_type: 'team',
      recipient_id: 'Warriors-XI',
      recipient_name: 'Warriors XI',
      linked_team_name: '',
    }, 'warriors xi')).toBe(true);
  });
});

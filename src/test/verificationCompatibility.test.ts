import { describe, expect, it } from 'vitest';

import { normalizeCertificateRecord, isCertificateAuthentic } from '@/lib/certificates';

describe('verification compatibility', () => {
  it('treats legacy certified certificate rows as authentic after normalization', () => {
    const normalized = normalizeCertificateRecord({
      certificate_id: 'CERT_1775328699178_nec',
      certificate_type: 'Tournament Winner',
      title: 'LPL',
      season_id: 2016,
      match_id: 'player',
      recipient_type: 'P_1773485108100_vxa',
      recipient_id: 'Saikumar Manne',
      recipient_name: 'P_1773485108100_vxa',
      certificate_html: 'TPL_GREEN_ARENA',
      qr_payload: 'CERTIFIED',
      security_hash: 'admin',
      approval_status: '2026-04-04T18:51:39.178Z',
      approvals_json: 'Match details',
      generated_by: 'performance stats',
      generated_at: 'VERIFY_1775328699178_gch',
      approved_at: '2026-04-05T15:50:03.886Z',
      delivery_status: 'admin',
    });

    expect(normalized.id).toBe('CERT_1775328699178_nec');
    expect(normalized.status).toBe('CERTIFIED');
    expect(normalized.verification_code).toBe('VERIFY_1775328699178_gch');
    expect(normalized.certified_at).toBe('2026-04-05T15:50:03.886Z');
    expect(normalized.certified_by).toBe('admin');
    expect(isCertificateAuthentic(normalized)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';

import { normalizeSheetRows } from '@/lib/dataUtils';
import { normalizeBoardConfigurationRow } from '@/lib/boardConfig';
import { normalizeCertificateRecord } from '@/lib/certificates';

describe('sheet compatibility normalization', () => {
  it('keeps date-only fields aligned to IST calendar dates', () => {
    const [row] = normalizeSheetRows([{ date: '2026-04-05T18:30:00.000Z' }]);
    expect(row.date).toBe('2026-04-06');
  });

  it('repairs shifted board configuration rows from legacy sheet headers', () => {
    const normalized = normalizeBoardConfigurationRow({
      config_id: 'BRCFG_1',
      current_period: '2026-2028 Administration Executive Team',
      administration_team_ids: 'M1,M2',
      updated_at: '[{"department_id":"competition_operations","head_id":"M1","team_ids":["M2"]}]',
      updated_by: '2026-04-03T10:06:56.066Z',
      elections_closed: 'admin',
      department_assignments_json: '',
    });

    expect(normalized.department_assignments_json).toContain('competition_operations');
    expect(normalized.updated_at).toBe('2026-04-03T10:06:56.066Z');
    expect(normalized.updated_by).toBe('admin');
  });

  it('normalizes legacy certificate rows so approval queue can read them', () => {
    const normalized = normalizeCertificateRecord({
      certificate_id: 'CERT_1',
      certificate_type: 'Tournament Winner',
      title: 'LPL',
      season_id: 2016,
      match_id: 'player',
      recipient_type: 'P_123',
      recipient_id: 'Saikumar Manne',
      recipient_name: 'P_123',
      certificate_html: 'TPL_GREEN_ARENA',
      qr_payload: 'PENDING_APPROVAL',
      security_hash: 'admin',
      approval_status: '2026-04-04T18:51:39.178Z',
      approvals_json: 'Match details',
      generated_by: 'Performance stats',
      generated_at: 'VERIFY_1',
    });

    expect(normalized.id).toBe('CERT_1');
    expect(normalized.type).toBe('Tournament Winner');
    expect(normalized.tournament).toBe('LPL');
    expect(normalized.season).toBe('2016');
    expect(normalized.recipient_type).toBe('player');
    expect(normalized.recipient_id).toBe('P_123');
    expect(normalized.recipient_name).toBe('Saikumar Manne');
    expect(normalized.linked_player_id).toBe('P_123');
    expect(normalized.template_id).toBe('TPL_GREEN_ARENA');
    expect(normalized.status).toBe('PENDING_APPROVAL');
    expect(normalized.created_by).toBe('admin');
    expect(normalized.created_at).toBe('2026-04-04T18:51:39.178Z');
    expect(normalized.verification_code).toBe('VERIFY_1');
  });
});
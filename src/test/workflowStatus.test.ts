import { describe, expect, it } from 'vitest';
import { DigitalScorelist, ManagementUser } from '@/lib/v2types';
import { getScorelistRoadmap, isScorelistLocked, resolveStageFromDesignation } from '@/lib/workflowStatus';

const baseScorelist: DigitalScorelist = {
  scorelist_id: 'SL-TEST',
  season_id: 'S1',
  tournament_id: 'T1',
  match_id: 'M1',
  scope_type: 'match',
  payload_json: '{}',
  hash_digest: 'abc',
  signature: 'sig',
  generated_by: 'admin',
  generated_at: '2026-04-18T00:00:00.000Z',
  certification_status: 'scoring_completed',
  certifications_json: '[]',
  locked: false,
};

describe('workflow status helpers', () => {
  it('maps scorer-like designations and role hints to scoring stage', () => {
    expect(resolveStageFromDesignation('Scorer')).toBe('scoring_completed');
    expect(resolveStageFromDesignation('Match Official', 'scoring official')).toBe('scoring_completed');
  });

  it('treats sheet string boolean values consistently for lock state', () => {
    expect(isScorelistLocked({ ...baseScorelist, locked: true })).toBe(true);
    expect(isScorelistLocked({ ...baseScorelist, locked: false })).toBe(false);
    expect(isScorelistLocked({ ...baseScorelist, locked: 'TRUE' as unknown as boolean })).toBe(true);
    expect(isScorelistLocked({ ...baseScorelist, locked: 'FALSE' as unknown as boolean })).toBe(false);
  });

  it('matches approvals by management id or username when computing pending approvers', () => {
    const managementUsers: ManagementUser[] = [{
      management_id: 'MGT-1',
      username: 'scorer.user',
      name: 'Scorer User',
      email: 'scorer@example.com',
      phone: '',
      designation: 'Scorer',
      role: 'Scoring Official',
      authority_level: 3,
      signature_image: '',
      status: 'active',
      created_at: '',
      password: '',
    }];

    const roadmap = getScorelistRoadmap({
      ...baseScorelist,
      certifications_json: JSON.stringify([{
        approver_id: 'scorer.user',
        approver_name: 'Scorer User',
        designation: 'Scorer',
        timestamp: '2026-04-18T00:00:00.000Z',
        token: 'CERT_TOKEN',
        stage: 'scoring_completed',
      }]),
    }, managementUsers);

    const scoringStep = roadmap.find((step) => step.stage === 'scoring_completed');
    expect(scoringStep?.pendingApprovers.length).toBe(0);
    expect(scoringStep?.completed).toBe(true);
  });
});

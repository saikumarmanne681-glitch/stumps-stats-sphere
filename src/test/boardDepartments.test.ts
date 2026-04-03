import { describe, expect, it } from 'vitest';
import { parseDepartmentAssignments } from '@/lib/boardDepartments';
import { BoardConfiguration } from '@/lib/v2types';

describe('board department assignments parsing', () => {
  it('parses array-based assignments payload', () => {
    const config: BoardConfiguration = {
      config_id: 'BRCFG1',
      current_period: '2026',
      administration_team_ids: 'M1,M2',
      department_assignments_json: JSON.stringify([
        { department_id: 'competition_operations', head_id: 'M1', team_ids: ['M2', 'M3'] },
      ]),
      updated_at: '2026-04-03T00:00:00.000Z',
      updated_by: 'admin',
    };
    const parsed = parseDepartmentAssignments(config);
    expect(parsed.find((item) => item.department_id === 'competition_operations')).toMatchObject({
      head_id: 'M1',
      team_ids: ['M2', 'M3'],
    });
  });

  it('parses legacy object-shaped assignments payload', () => {
    const config: BoardConfiguration = {
      config_id: 'BRCFG2',
      current_period: '2026',
      administration_team_ids: 'M1,M2',
      department_assignments_json: JSON.stringify({
        competition_operations: { head_id: 'M4', team_id: 'M5' },
        finance_compliance: { head_id: 'M6', team_ids: ['M7', 'M8'] },
      }),
      updated_at: '2026-04-03T00:00:00.000Z',
      updated_by: 'admin',
    };
    const parsed = parseDepartmentAssignments(config);
    expect(parsed.find((item) => item.department_id === 'competition_operations')).toMatchObject({
      head_id: 'M4',
      team_ids: ['M5'],
    });
    expect(parsed.find((item) => item.department_id === 'finance_compliance')).toMatchObject({
      head_id: 'M6',
      team_ids: ['M7', 'M8'],
    });
  });
});

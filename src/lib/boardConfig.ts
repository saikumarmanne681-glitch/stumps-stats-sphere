import { BoardConfiguration } from '@/lib/v2types';

function timestampValue(value?: string) {
  const time = new Date(String(value || '').trim()).getTime();
  return Number.isFinite(time) ? time : 0;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function looksJson(value?: string) {
  return /^[\[{]/.test(String(value || '').trim());
}

function looksTimestamp(value?: string) {
  const text = String(value || '').trim();
  return !!text && Number.isFinite(new Date(text).getTime());
}

export function normalizeBoardConfigurationRow(raw: Partial<BoardConfiguration> | Record<string, unknown>): BoardConfiguration {
  const row = raw as Record<string, unknown>;
  const shiftedDepartmentAssignments = looksJson(String(row.updated_at || '')) ? String(row.updated_at || '').trim() : '';
  const shiftedUpdatedAt = looksTimestamp(String(row.updated_by || '')) ? String(row.updated_by || '').trim() : '';
  const shiftedUpdatedBy = !looksTimestamp(String(row.elections_closed || '')) ? String(row.elections_closed || '').trim() : '';

  return {
    config_id: firstString(row.config_id, row.id) || `BRCFG_${Date.now()}`,
    current_period: firstString(row.current_period),
    administration_team_ids: firstString(row.administration_team_ids),
    department_assignments_json: firstString(row.department_assignments_json, shiftedDepartmentAssignments),
    updated_at: firstString(row.updated_at, shiftedUpdatedAt),
    updated_by: firstString(
      !looksTimestamp(String(row.updated_by || '')) ? row.updated_by : '',
      shiftedUpdatedBy,
      'admin',
    ),
  };
}

export function selectLatestBoardConfiguration(rows: BoardConfiguration[]): BoardConfiguration | null {
  return rows.reduce<BoardConfiguration | null>((latest, row) => {
    if (!latest) return row;

    const latestTime = timestampValue(latest.updated_at);
    const rowTime = timestampValue(row.updated_at);

    if (rowTime >= latestTime) return row;
    return latest;
  }, null);
}
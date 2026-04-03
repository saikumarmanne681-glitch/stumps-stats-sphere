import { BoardConfiguration } from '@/lib/v2types';

function timestampValue(value?: string) {
  const time = new Date(String(value || '').trim()).getTime();
  return Number.isFinite(time) ? time : 0;
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
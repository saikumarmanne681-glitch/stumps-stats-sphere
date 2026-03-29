import { Match } from '@/lib/types';
import { SupportTicket, TeamProfile, TeamTitleRecord } from '@/lib/v2types';

const QA_STORAGE_KEY = 'weekly_qa_mock_data_v1';

export interface QAMockDataBundle {
  enabled: boolean;
  created_at: string;
  profiles: TeamProfile[];
  titles: TeamTitleRecord[];
  tickets: SupportTicket[];
  matches: Match[];
}

const emptyBundle: QAMockDataBundle = {
  enabled: false,
  created_at: '',
  profiles: [],
  titles: [],
  tickets: [],
  matches: [],
};

export function readQAMockData(): QAMockDataBundle {
  if (typeof window === 'undefined') return emptyBundle;
  try {
    const raw = window.sessionStorage.getItem(QA_STORAGE_KEY);
    if (!raw) return emptyBundle;
    const parsed = JSON.parse(raw) as Partial<QAMockDataBundle>;
    return {
      enabled: !!parsed.enabled,
      created_at: String(parsed.created_at || ''),
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
      titles: Array.isArray(parsed.titles) ? parsed.titles : [],
      tickets: Array.isArray(parsed.tickets) ? parsed.tickets : [],
      matches: Array.isArray(parsed.matches) ? parsed.matches : [],
    };
  } catch {
    return emptyBundle;
  }
}

export function writeQAMockData(bundle: QAMockDataBundle) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(QA_STORAGE_KEY, JSON.stringify(bundle));
}

export function clearQAMockData() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(QA_STORAGE_KEY);
}

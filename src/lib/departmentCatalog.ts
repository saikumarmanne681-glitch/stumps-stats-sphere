export interface DepartmentCatalogEntry {
  id: string;
  name: string;
  description?: string;
  logo: string;
  aliases?: string[];
}

const normalize = (value?: string) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[_-]+/g, ' ')
  .replace(/[^a-z0-9 ]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export const DEPARTMENT_CATALOG: DepartmentCatalogEntry[] = [
  {
    id: 'competition_operations',
    name: 'Competition Operations',
    description: 'Fixtures, umpire coordination, venue readiness and match-day governance.',
    logo: '🏏',
    aliases: ['competition operations', 'operations committee', 'tournament operations'],
  },
  {
    id: 'player_welfare_development',
    name: 'Player Welfare & Development',
    description: 'Player relations, grievance support, training pathways and performance guidance.',
    logo: '🧑‍🤝‍🧑',
    aliases: ['player welfare development', 'welfare', 'development'],
  },
  {
    id: 'discipline_ethics',
    name: 'Discipline & Ethics',
    description: 'Code-of-conduct, dispute resolution, and integrity compliance reviews.',
    logo: '⚖️',
    aliases: ['discipline ethics', 'discipline', 'ethics', 'referee'],
  },
  {
    id: 'finance_compliance',
    name: 'Finance & Compliance',
    description: 'Budget approvals, payout checks, reimbursements, and policy compliance.',
    logo: '💼',
    aliases: ['finance compliance', 'treasurer', 'finance and compliance'],
  },
  {
    id: 'media_community',
    name: 'Media & Community Engagement',
    description: 'Announcements, fan engagement, communication workflows, and outreach.',
    logo: '📣',
    aliases: ['media community', 'media and community engagement', 'communications'],
  },
  { id: 'executive_board', name: 'Executive Board', logo: '👑', aliases: ['executive board', 'board'] },
  { id: 'governance', name: 'Governance', logo: '🛡️', aliases: ['governance'] },
  { id: 'tournament', name: 'Tournament', logo: '🏆', aliases: ['tournament'] },
  { id: 'finance', name: 'Finance', logo: '💰', aliases: ['finance'] },
  { id: 'legal', name: 'Legal', logo: '📜', aliases: ['legal'] },
  { id: 'operations', name: 'Operations', logo: '⚙️', aliases: ['operations'] },
  { id: 'general', name: 'General', logo: '🏢', aliases: ['general'] },
];

const byId = new Map(DEPARTMENT_CATALOG.map((entry) => [entry.id, entry]));

export function normalizeDepartmentToken(value?: string): string {
  return normalize(value);
}

export function getDepartmentById(id?: string | null): DepartmentCatalogEntry | null {
  const normalized = normalize(id).replace(/\s+/g, '_');
  return byId.get(normalized) || null;
}

export function getDepartmentByName(value?: string | null): DepartmentCatalogEntry | null {
  const normalized = normalize(value);
  if (!normalized) return null;

  const exact = DEPARTMENT_CATALOG.find((entry) => normalize(entry.name) === normalized);
  if (exact) return exact;

  const alias = DEPARTMENT_CATALOG.find((entry) =>
    (entry.aliases || []).some((token) => normalize(token) === normalized),
  );
  if (alias) return alias;

  const fuzzy = DEPARTMENT_CATALOG.find((entry) => {
    const targets = [entry.name, ...(entry.aliases || [])].map((token) => normalize(token));
    return targets.some((token) => token.includes(normalized) || normalized.includes(token));
  });
  return fuzzy || null;
}

export function resolveDepartmentCatalogEntry(input?: { id?: string | null; name?: string | null }): DepartmentCatalogEntry {
  const byKnownId = getDepartmentById(input?.id);
  if (byKnownId) return byKnownId;

  const byName = getDepartmentByName(input?.name || input?.id);
  if (byName) return byName;

  const fallbackName = String(input?.name || input?.id || '').trim() || 'General';
  return {
    id: normalize(fallbackName).replace(/\s+/g, '_') || 'general',
    name: fallbackName,
    logo: '🏢',
  };
}

export const BOARD_DEPARTMENT_IDS = [
  'competition_operations',
  'player_welfare_development',
  'discipline_ethics',
  'finance_compliance',
  'media_community',
] as const;

export function getBoardDepartments() {
  return BOARD_DEPARTMENT_IDS
    .map((id) => getDepartmentById(id))
    .filter((entry): entry is DepartmentCatalogEntry => Boolean(entry));
}

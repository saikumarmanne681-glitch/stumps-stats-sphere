export interface DepartmentBranding {
  key: string;
  label: string;
  logo: string;
}

const BRANDS: DepartmentBranding[] = [
  { key: 'competition operations', label: 'Competition Operations', logo: '🏏' },
  { key: 'player welfare development', label: 'Player Welfare & Development', logo: '🧑‍🤝‍🧑' },
  { key: 'discipline ethics', label: 'Discipline & Ethics', logo: '⚖️' },
  { key: 'finance compliance', label: 'Finance & Compliance', logo: '💼' },
  { key: 'media community engagement', label: 'Media & Community Engagement', logo: '📣' },
  { key: 'executive board', label: 'Executive Board', logo: '👑' },
  { key: 'governance', label: 'Governance', logo: '🛡️' },
  { key: 'tournament', label: 'Tournament', logo: '🏆' },
  { key: 'finance', label: 'Finance', logo: '💰' },
  { key: 'legal', label: 'Legal', logo: '📜' },
  { key: 'operations', label: 'Operations', logo: '⚙️' },
];

const normalize = (value?: string) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function resolveDepartmentBranding(value?: string): DepartmentBranding {
  const normalized = normalize(value);
  const direct = BRANDS.find((item) => item.key === normalized);
  if (direct) return direct;
  const contains = BRANDS.find((item) => normalized.includes(item.key) || item.key.includes(normalized));
  if (contains) return contains;
  if (!normalized) return { key: 'general', label: 'General', logo: '🏢' };
  return { key: normalized, label: String(value || 'General').trim(), logo: '🏢' };
}

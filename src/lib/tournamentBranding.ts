export interface TournamentBranding {
  shortCode: string;
  tagline: string;
  accentClass: string;
}

function initialsFromName(name: string): string {
  const tokens = name
    .split(/[^A-Za-z0-9]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) return 'TRN';
  if (tokens.length === 1) return tokens[0].slice(0, 3).toUpperCase();

  return tokens.slice(0, 3).map((token) => token[0]?.toUpperCase() ?? '').join('');
}

export function getTournamentBranding(name: string): TournamentBranding {
  const normalized = name.toLowerCase();

  if (normalized.includes('premier')) {
    return { shortCode: initialsFromName(name), tagline: 'Premier Tournament Series', accentClass: 'from-indigo-500 to-blue-600' };
  }

  if (normalized.includes('cup')) {
    return { shortCode: initialsFromName(name), tagline: 'Championship Cup', accentClass: 'from-cyan-500 to-sky-600' };
  }

  if (normalized.includes('league')) {
    return { shortCode: initialsFromName(name), tagline: 'Elite League Competition', accentClass: 'from-emerald-500 to-teal-600' };
  }

  return { shortCode: initialsFromName(name), tagline: 'Official Tournament Event', accentClass: 'from-primary to-accent' };
}

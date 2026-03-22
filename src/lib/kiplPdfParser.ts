/**
 * Parser for KIPL (Kurnool Indoor Premier League) style PDF scorelist format.
 *
 * The KIPL format has a table with columns:
 *   Team v Team | Date | Team1 score (overs) | Team2 score (overs) | TEAM1 SCORE LIST [Name, R, W] x3 | TEAM2 SCORE LIST [Name, R, W] x3
 *
 * Each match occupies 3 rows in the table (one per player per side).
 * Sections like "QF1,ELI", "QF-2", "FINAL" denote match stages.
 *
 * This parser takes the raw text extracted from the PDF and produces structured match data.
 */

import type { ScorecardImportMatchDraft } from './pdfScorecardImport';

export interface KiplMatchExtracted {
  team_a_abbr: string;
  team_b_abbr: string;
  date_raw: string;
  team_a_score: string;
  team_a_overs: string;
  team_b_score: string;
  team_b_overs: string;
  match_stage: string;
  team1_players: { name: string; runs: number; wickets: number }[];
  team2_players: { name: string; runs: number; wickets: number }[];
}

/** Known team abbreviation → full team name mapping (owner-based teams) */
const TEAM_ABBR_MAP: Record<string, string> = {
  DAY: 'DAYAKAR',
  SAI: 'SAIKUMAR',
  CHA: 'CHANDU',
  OMP: 'OMPRAKASH',
  PRA: 'PRABHAKAR',
};

function cleanNumber(raw: string): number {
  const cleaned = raw.replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

function parseDateRaw(raw: string): string {
  // Expected format: dd/mm/yy or dd/mm/yyyy
  const trimmed = raw.trim();
  const parts = trimmed.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.length === 2) {
      year = parseInt(year, 10) > 50 ? `19${year}` : `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }
  return '';
}

function resolveTeamName(abbr: string, teamMapping?: Record<string, string>): string {
  const upper = abbr.trim().toUpperCase();
  if (teamMapping && teamMapping[upper]) return teamMapping[upper];
  if (TEAM_ABBR_MAP[upper]) return TEAM_ABBR_MAP[upper];
  return upper;
}

/**
 * Parse raw text lines from the KIPL PDF format.
 * The text is expected to come from a table extraction or OCR.
 */
export function parseKiplText(rawText: string, teamMapping?: Record<string, string>): KiplMatchExtracted[] {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const matches: KiplMatchExtracted[] = [];
  let currentStage = 'League';

  // Detect section headers for match stages
  const stagePatterns: [RegExp, string][] = [
    [/^#?\s*(QF[\-\s]*1|QUARTER\s*FINAL\s*1)/i, 'QF1'],
    [/^#?\s*(QF[\-\s]*2|QUARTER\s*FINAL\s*2)/i, 'QF2'],
    [/^#?\s*(SF[\-\s]*1|SEMI\s*FINAL\s*1)/i, 'SF1'],
    [/^#?\s*(SF[\-\s]*2|SEMI\s*FINAL\s*2)/i, 'SF2'],
    [/^#?\s*(QF1?\s*,?\s*ELI|ELIMINATOR)/i, 'QF/Eliminator'],
    [/^#?\s*FINAL/i, 'Final'],
  ];

  // Parse pipe-delimited table rows
  const tableRows: string[][] = [];
  for (const line of lines) {
    // Check for stage headers
    for (const [pattern, stage] of stagePatterns) {
      if (pattern.test(line.replace(/[#*]/g, '').trim())) {
        currentStage = stage;
      }
    }

    // Skip header/separator rows
    if (/^[\|\-\s]+$/.test(line)) continue;
    if (/Team\s*v|NAME SCORERS|TEAM1|TEAM2|PLAYERS SCORING|TEAM SCORING|POINTS TABLE|HISTORY|BEST SCORE|POS\b/i.test(line)) continue;

    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim()).filter((_, i, arr) => i > 0 || arr[0] !== '');
      // Remove leading/trailing empty from pipe split
      while (parts.length > 0 && parts[0] === '') parts.shift();
      while (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
      if (parts.length >= 6) {
        tableRows.push([...parts, currentStage]);
      }
    }
  }

  // Group table rows into matches (3 rows per match typically)
  // First row has: TeamA abbr, VS on row 2, date, scores, player data
  // The pattern: row with team abbr in col 0, "VS" in next row col 0, team abbr may be split
  
  let i = 0;
  while (i < tableRows.length) {
    const row = tableRows[i];
    // Try to detect a match block start: first column has a team abbreviation
    const col0 = (row[0] || '').toUpperCase().replace(/[^A-Z]/g, '');
    
    if (col0 && col0 !== 'VS' && col0.length >= 2 && col0.length <= 5) {
      // This might be the start of a match block
      // Collect up to 3+ rows until we hit the next match block
      const matchRows: string[][] = [row];
      let j = i + 1;
      while (j < tableRows.length) {
        const nextCol0 = (tableRows[j][0] || '').toUpperCase().replace(/[^A-Z]/g, '');
        if (nextCol0 === 'VS' || nextCol0 === '' || nextCol0 === col0) {
          matchRows.push(tableRows[j]);
          j++;
        } else {
          // Check if this is a continuation row (empty first col or same team)
          const isNewMatch = nextCol0.length >= 2 && nextCol0.length <= 5 && nextCol0 !== 'VS';
          if (isNewMatch && matchRows.length >= 2) break;
          matchRows.push(tableRows[j]);
          j++;
        }
      }

      const extracted = extractMatchFromRows(matchRows, teamMapping);
      if (extracted) {
        matches.push(extracted);
      }
      i = j;
    } else {
      i++;
    }
  }

  return matches;
}

function extractMatchFromRows(rows: string[][], teamMapping?: Record<string, string>): KiplMatchExtracted | null {
  if (rows.length < 2) return null;

  // Find team abbreviations and VS row
  let teamA = '';
  let teamB = '';
  let dateRaw = '';
  let teamAScore = '';
  let teamBScore = '';
  let teamAOvers = '';
  let teamBOvers = '';
  const stage = rows[0][rows[0].length - 1] || 'League';

  const team1Players: { name: string; runs: number; wickets: number }[] = [];
  const team2Players: { name: string; runs: number; wickets: number }[] = [];

  for (const row of rows) {
    const col0 = (row[0] || '').toUpperCase().replace(/[^A-Z]/g, '');
    
    // Extract team names
    if (col0 && col0 !== 'VS' && col0.length >= 2 && col0.length <= 5) {
      if (!teamA) teamA = col0;
      else if (col0 !== teamA && !teamB) teamB = col0;
    }

    // Extract date
    if (row[1] && /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(row[1])) {
      dateRaw = row[1].trim();
    }

    // Extract scores - look for pattern like "34/3" or "65/3"
    for (let c = 2; c <= 3 && c < row.length - 1; c++) {
      const scoreMatch = (row[c] || '').match(/(\d+)\/(\d+)/);
      const oversMatch = (row[c] || '').match(/\(([0-9.]+)\)/);
      if (scoreMatch) {
        if (c === 2 && !teamAScore) teamAScore = row[c].trim();
        else if (c === 3 && !teamBScore) teamBScore = row[c].trim();
      }
      if (oversMatch) {
        if (c === 2) teamAOvers = oversMatch[1];
        else if (c === 3) teamBOvers = oversMatch[1];
      }
    }

    // Extract player data - typically columns 4,5,6 for team1 and 7,8,9 for team2
    // But column indices vary. Look for name + number + number pattern
    const extractPlayers = (startIdx: number): { name: string; runs: number; wickets: number } | null => {
      if (startIdx + 2 >= row.length - 1) return null; // -1 for stage column
      const name = (row[startIdx] || '').replace(/[\\*]/g, '').trim();
      const runs = (row[startIdx + 1] || '').replace(/[\\*]/g, '').trim();
      const wickets = (row[startIdx + 2] || '').replace(/[\\*]/g, '').trim();
      if (name && /^[A-Za-z.\s]+$/.test(name) && /^\d+$/.test(runs.replace(/[^0-9]/g, ''))) {
        return {
          name: name.trim(),
          runs: cleanNumber(runs),
          wickets: cleanNumber(wickets),
        };
      }
      return null;
    };

    // Try different column offsets for player data
    const p1 = extractPlayers(4) || extractPlayers(3);
    const p2 = extractPlayers(7) || extractPlayers(6);
    
    if (p1) team1Players.push(p1);
    if (p2) team2Players.push(p2);
  }

  if (!teamA || team1Players.length === 0) return null;

  return {
    team_a_abbr: teamA,
    team_b_abbr: teamB || 'UNKNOWN',
    date_raw: dateRaw,
    team_a_score: teamAScore,
    team_a_overs: teamAOvers,
    team_b_score: teamBScore,
    team_b_overs: teamBOvers,
    match_stage: stage,
    team1_players: team1Players,
    team2_players: team2Players,
  };
}

/**
 * Convert extracted KIPL matches into ScorecardImportMatchDraft format.
 * In KIPL format, each player entry has R (runs) and W (wickets).
 * R = runs scored when batting / runs conceded when bowling
 * W = wickets taken when bowling
 */
export function kiplMatchesToDrafts(
  extracted: KiplMatchExtracted[],
  pdfName: string,
  teamMapping?: Record<string, string>,
): ScorecardImportMatchDraft[] {
  return extracted.map((match, idx) => {
    const teamA = resolveTeamName(match.team_a_abbr, teamMapping);
    const teamB = resolveTeamName(match.team_b_abbr, teamMapping);
    const date = parseDateRaw(match.date_raw);

    // In KIPL format, R column = runs scored by the player
    // W column = wickets taken by the player (bowling)
    // Team1 players bat AND bowl - their R is batting runs, W is bowling wickets
    // Build batting text: each player's R is their batting runs
    const battingLines: string[] = [
      `# ${teamA} vs ${teamB} - ${date || match.date_raw}`,
      '# Format: Player Name | Team | Runs | Balls | 4s | 6s | How out | Bowler',
    ];
    const bowlingLines: string[] = [
      `# ${teamA} vs ${teamB} - ${date || match.date_raw}`,
      '# Format: Player Name | Team | Overs | Maidens | Runs | Wickets | Extras',
    ];

    // Team1 players - batting data (R column)
    match.team1_players.forEach(p => {
      battingLines.push(`${p.name} | ${teamA} | ${p.runs} | 0 | 0 | 0 | not out | `);
    });
    // Team2 players - batting data (R column)
    match.team2_players.forEach(p => {
      battingLines.push(`${p.name} | ${teamB} | ${p.runs} | 0 | 0 | 0 | not out | `);
    });

    // Team1 players - bowling data (W column = wickets taken, bowling against Team2)
    match.team1_players.filter(p => p.wickets > 0).forEach(p => {
      bowlingLines.push(`${p.name} | ${teamA} | 0 | 0 | 0 | ${p.wickets} | 0`);
    });
    // Team2 players - bowling data (W column = wickets taken, bowling against Team1)
    match.team2_players.filter(p => p.wickets > 0).forEach(p => {
      bowlingLines.push(`${p.name} | ${teamB} | 0 | 0 | 0 | ${p.wickets} | 0`);
    });

    // Determine result
    const aScore = match.team_a_score.match(/(\d+)/);
    const bScore = match.team_b_score.match(/(\d+)/);
    const aRuns = aScore ? parseInt(aScore[1], 10) : 0;
    const bRuns = bScore ? parseInt(bScore[1], 10) : 0;
    let result = '';
    if (aRuns > bRuns) result = `${teamA} won`;
    else if (bRuns > aRuns) result = `${teamB} won`;
    else result = 'Tie';

    return {
      draft_id: `kipl-${idx}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      source_pdf_id: `${pdfName}-match-${idx}`,
      source_pdf_name: pdfName,
      date,
      team_a: teamA,
      team_b: teamB,
      venue: '',
      result,
      toss_winner: '',
      toss_decision: '',
      man_of_match: '',
      match_stage: match.match_stage,
      status: 'completed',
      batting_text: battingLines.join('\n'),
      bowling_text: bowlingLines.join('\n'),
    };
  });
}

/**
 * Try to detect if text is in KIPL scorelist format.
 */
export function isKiplFormat(text: string): boolean {
  const hasKiplHeader = /KIPL|SCORE\s*LIST\s*NO/i.test(text);
  const hasTeamVs = /\bVS\b/i.test(text);
  const hasScorePattern = /\d+\/\d+/.test(text);
  const hasPlayerRW = /\|\s*\d+\s*\|\s*\d+\s*\|/.test(text);
  return (hasKiplHeader || (hasTeamVs && hasScorePattern && hasPlayerRW));
}

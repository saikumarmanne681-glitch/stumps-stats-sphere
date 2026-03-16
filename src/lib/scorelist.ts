import { Match, BattingScorecard, BowlingScorecard, Player, Tournament, Season } from "./types";
import { DigitalScorelist } from "./v2types";
import { v2api, istNow, logAudit } from "./v2api";

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sign(payload: string, hash: string): Promise<string> {
  const secret = "CRICKET_CLUB_SCORELIST_SECRET_v2";
  return sha256(hash + secret + payload.length.toString());
}

interface ScorelistPayload {
  match?: Match;
  matches?: Match[];
  battingData: BattingScorecard[];
  bowlingData: BowlingScorecard[];
  players: Player[];
  tournament?: Tournament;
  season?: Season;
  leaderboards?: any;
  generatedAt: string;
}

export async function generateMatchScorelist(
  match: Match,
  batting: BattingScorecard[],
  bowling: BowlingScorecard[],
  players: Player[],
  tournament: Tournament | undefined,
  season: Season | undefined,
  generatedBy: string,
): Promise<DigitalScorelist> {
  const payload: ScorelistPayload = {
    match,
    battingData: batting.filter((b) => b.match_id === match.match_id),
    bowlingData: bowling.filter((b) => b.match_id === match.match_id),
    players,
    tournament,
    season,
    generatedAt: istNow(),
  };

  const payloadJson = JSON.stringify(payload);
  const hash = await sha256(payloadJson);
  const sig = await sign(payloadJson, hash);

  const seasonPart = season ? season.season_id.substring(0, 8) : "NA";
  const tournPart = tournament ? tournament.tournament_id.substring(0, 6) : "NA";
  const matchPart = match.match_id.substring(0, 10);
  const hashShort = hash.substring(0, 8);

  const scorelist: DigitalScorelist = {
    scorelist_id: `SL-${seasonPart}-${tournPart}-${matchPart}-${hashShort}`,
    season_id: match.season_id,
    tournament_id: match.tournament_id,
    match_id: match.match_id,
    scope_type: "match",
    payload_json: payloadJson,
    hash_digest: hash,
    signature: sig,
    generated_by: generatedBy,
    generated_at: istNow(),
  };

  await v2api.addScorelist(scorelist);
  logAudit(generatedBy, "generate_scorelist", "match", match.match_id, scorelist.scorelist_id);

  return scorelist;
}

export async function generateTournamentScorelist(
  tournament: Tournament,
  season: Season,
  matches: Match[],
  batting: BattingScorecard[],
  bowling: BowlingScorecard[],
  players: Player[],
  generatedBy: string,
): Promise<DigitalScorelist> {
  const matchIds = matches.map((m) => m.match_id);

  const seasonBatting = batting.filter((b) => matchIds.includes(b.match_id));
  const seasonBowling = bowling.filter((b) => matchIds.includes(b.match_id));

  const topRuns = [...seasonBatting].sort((a, b) => b.runs - a.runs).slice(0, 10);

  const topWickets = [...seasonBowling].sort((a, b) => b.wickets - a.wickets).slice(0, 10);

  const payload: ScorelistPayload = {
    matches,
    battingData: seasonBatting,
    bowlingData: seasonBowling,
    players,
    tournament,
    season,
    leaderboards: {
      topRuns,
      topWickets,
    },
    generatedAt: istNow(),
  };

  const payloadJson = JSON.stringify(payload);
  const hash = await sha256(payloadJson);
  const sig = await sign(payloadJson, hash);

  const seasonPart = season.season_id.substring(0, 8);
  const tournPart = tournament.tournament_id.substring(0, 6);
  const hashShort = hash.substring(0, 8);

  const scorelist: DigitalScorelist = {
    scorelist_id: `TSL-${seasonPart}-${tournPart}-${hashShort}`,
    season_id: season.season_id,
    tournament_id: tournament.tournament_id,
    match_id: "",
    scope_type: "tournament",
    payload_json: payloadJson,
    hash_digest: hash,
    signature: sig,
    generated_by: generatedBy,
    generated_at: istNow(),
  };

  await v2api.addScorelist(scorelist);

  logAudit(generatedBy, "generate_scorelist", "tournament", tournament.tournament_id, scorelist.scorelist_id);

  return scorelist;
}

export async function verifyScorelist(scorelist: DigitalScorelist): Promise<{ valid: boolean; reason?: string }> {
  const recomputedHash = await sha256(scorelist.payload_json);

  if (recomputedHash !== scorelist.hash_digest) {
    return { valid: false, reason: "Hash mismatch — payload has been tampered with" };
  }

  const recomputedSig = await sign(scorelist.payload_json, recomputedHash);

  if (recomputedSig !== scorelist.signature) {
    return { valid: false, reason: "Signature invalid — document integrity compromised" };
  }

  return { valid: true };
}

export function exportScorelistAsJSON(scorelist: DigitalScorelist): string {
  return JSON.stringify(
    {
      id: scorelist.scorelist_id,
      scope: scorelist.scope_type,
      hash: scorelist.hash_digest,
      signature: scorelist.signature,
      generatedAt: scorelist.generated_at,
      generatedBy: scorelist.generated_by,
      payload: JSON.parse(scorelist.payload_json),
    },
    null,
    2,
  );
}

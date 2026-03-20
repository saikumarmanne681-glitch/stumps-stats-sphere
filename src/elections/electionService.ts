import { generateId } from '@/lib/utils';
import { getActorId, getActorName } from '@/lib/accessControl';
import { AuthUser } from '@/lib/types';
import { logAudit, v2api } from '@/lib/v2api';
import { ElectionAuditLog, ElectionRecord, ElectionResultSummary, ElectionTermRecord, NominationRecord, VoteRecord } from './types';

const STORAGE = {
  elections: 'club:elections',
  nominations: 'club:nominations',
  votes: 'club:votes',
  terms: 'club:election-terms',
  audit: 'club:elections:audit',
} as const;

const SHEETS = {
  elections: 'elections',
  nominations: 'nominations',
  votes: 'votes',
  terms: 'election_terms',
} as const;

const read = <T,>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T[] : [];
  } catch {
    return [];
  }
};

const write = <T,>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

async function digest(input: string) {
  const bytes = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function appendAudit(entry: ElectionAuditLog) {
  const items = read<ElectionAuditLog>(STORAGE.audit);
  items.unshift(entry);
  write(STORAGE.audit, items.slice(0, 500));
  logAudit(entry.actor_id, entry.action, entry.entity_type, entry.entity_id, entry.details);
}

async function safeSyncRow<T>(method: 'add' | 'update', sheet: string, row: T) {
  try {
    await v2api.syncHeaders().catch(() => false);
    if (method === 'add') return await v2api.addCustomSheetRow(sheet, row);
    return await v2api.updateCustomSheetRow(sheet, row);
  } catch {
    return false;
  }
}

export const electionService = {
  getTables() {
    return ['elections', 'nominations', 'votes', 'election_terms'] as const;
  },

  async syncFromBackend() {
    try {
      await v2api.syncHeaders().catch(() => false);
      const [elections, nominations, votes, terms] = await Promise.all([
        v2api.getCustomSheet<ElectionRecord>(SHEETS.elections),
        v2api.getCustomSheet<NominationRecord>(SHEETS.nominations),
        v2api.getCustomSheet<VoteRecord>(SHEETS.votes),
        v2api.getCustomSheet<ElectionTermRecord>(SHEETS.terms),
      ]);
      if (elections.length) write(STORAGE.elections, elections);
      if (nominations.length) write(STORAGE.nominations, nominations);
      if (votes.length) write(STORAGE.votes, votes);
      if (terms.length) write(STORAGE.terms, terms);
    } catch {
      // local cache remains the fallback if Apps Script is not ready yet
    }
  },

  getElections() {
    return read<ElectionRecord>(STORAGE.elections).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  getNominations() {
    return read<NominationRecord>(STORAGE.nominations).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  getVotes() {
    return read<VoteRecord>(STORAGE.votes).sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
  },

  getTerms() {
    return read<ElectionTermRecord>(STORAGE.terms).sort((a, b) => b.assigned_at.localeCompare(a.assigned_at));
  },

  getAuditLogs() {
    return read<ElectionAuditLog>(STORAGE.audit);
  },

  async createElection(input: Omit<ElectionRecord, 'election_id' | 'created_at' | 'results_published_at'>, user: AuthUser) {
    if (user.type !== 'admin') throw new Error('Only admin can create elections.');
    const record: ElectionRecord = {
      ...input,
      election_id: generateId('ELC'),
      created_at: new Date().toISOString(),
      results_published_at: '',
    };
    write(STORAGE.elections, [record, ...this.getElections()]);
    await safeSyncRow('add', SHEETS.elections, record);
    appendAudit({
      audit_id: generateId('EAUD'),
      module: 'elections',
      entity_type: 'election',
      entity_id: record.election_id,
      action: 'create_election',
      actor_id: getActorId(user),
      actor_name: getActorName(user),
      timestamp: new Date().toISOString(),
      details: JSON.stringify({ title: record.title, roles: record.roles_json, status: record.status }),
    });
    return record;
  },

  async submitNomination(input: Omit<NominationRecord, 'nomination_id' | 'created_at' | 'status' | 'reviewed_by' | 'reviewed_at'>, user: AuthUser) {
    if (user.type !== 'player') throw new Error('Only players can submit nominations.');
    const record: NominationRecord = {
      ...input,
      nomination_id: generateId('NOM'),
      created_at: new Date().toISOString(),
      status: 'pending',
      reviewed_by: '',
      reviewed_at: '',
    };
    write(STORAGE.nominations, [record, ...this.getNominations()]);
    await safeSyncRow('add', SHEETS.nominations, record);
    appendAudit({
      audit_id: generateId('EAUD'),
      module: 'elections',
      entity_type: 'nomination',
      entity_id: record.nomination_id,
      action: 'submit_nomination',
      actor_id: getActorId(user),
      actor_name: getActorName(user),
      timestamp: new Date().toISOString(),
      details: JSON.stringify({ electionId: record.election_id, roleName: record.role_name, nominee: record.nominee_name }),
    });
    return record;
  },

  async reviewNomination(nominationId: string, status: 'approved' | 'rejected', user: AuthUser) {
    if (user.type !== 'admin') throw new Error('Only admin can review nominations.');
    const updated = this.getNominations().map((item) => item.nomination_id === nominationId ? { ...item, status, reviewed_by: getActorId(user), reviewed_at: new Date().toISOString() } : item);
    write(STORAGE.nominations, updated);
    const changed = updated.find((item) => item.nomination_id === nominationId);
    if (changed) await safeSyncRow('update', SHEETS.nominations, changed);
    appendAudit({
      audit_id: generateId('EAUD'),
      module: 'elections',
      entity_type: 'nomination',
      entity_id: nominationId,
      action: `nomination_${status}`,
      actor_id: getActorId(user),
      actor_name: getActorName(user),
      timestamp: new Date().toISOString(),
      details: JSON.stringify({ status }),
    });
  },

  async castVotes(input: { electionId: string; selections: Record<string, { nominee_user_id: string; nominee_name: string }> }, user: AuthUser) {
    if (user.type !== 'player') throw new Error('Only players can vote in elections.');
    const voterId = getActorId(user);
    const voterName = getActorName(user);
    const existing = this.getVotes().filter((vote) => vote.election_id === input.electionId && vote.voter_user_id === voterId);
    const incomingRoles = Object.keys(input.selections);
    if (existing.some((vote) => incomingRoles.includes(vote.role_name))) {
      throw new Error('You have already voted for one or more selected roles.');
    }

    const newVotes = await Promise.all(incomingRoles.map(async (roleName) => {
      const selection = input.selections[roleName];
      const immutable_hash = await digest(`${input.electionId}:${roleName}:${voterId}:${selection.nominee_user_id}:${Date.now()}`);
      const vote: VoteRecord = {
        vote_id: generateId('VOTE'),
        election_id: input.electionId,
        role_name: roleName,
        voter_user_id: voterId,
        voter_name: voterName,
        nominee_user_id: selection.nominee_user_id,
        nominee_name: selection.nominee_name,
        submitted_at: new Date().toISOString(),
        immutable_hash,
      };
      await safeSyncRow('add', SHEETS.votes, vote);
      return vote;
    }));

    write(STORAGE.votes, [...newVotes, ...this.getVotes()]);
    appendAudit({
      audit_id: generateId('EAUD'),
      module: 'elections',
      entity_type: 'vote_batch',
      entity_id: input.electionId,
      action: 'cast_votes',
      actor_id: voterId,
      actor_name: voterName,
      timestamp: new Date().toISOString(),
      details: JSON.stringify({ roles: incomingRoles }),
    });
    return newVotes;
  },

  calculateResults(electionId: string) {
    const votes = this.getVotes().filter((vote) => vote.election_id === electionId);
    const grouped = new Map<string, Map<string, { nominee_name: string; votes: number }>>();
    votes.forEach((vote) => {
      if (!grouped.has(vote.role_name)) grouped.set(vote.role_name, new Map());
      const roleMap = grouped.get(vote.role_name)!;
      const current = roleMap.get(vote.nominee_user_id) || { nominee_name: vote.nominee_name, votes: 0 };
      roleMap.set(vote.nominee_user_id, { nominee_name: vote.nominee_name, votes: current.votes + 1 });
    });

    const results: ElectionResultSummary[] = [];
    grouped.forEach((roleVotes, role_name) => {
      const nominees = Array.from(roleVotes.entries())
        .map(([nominee_user_id, meta]) => ({ nominee_user_id, nominee_name: meta.nominee_name, votes: meta.votes }))
        .sort((a, b) => b.votes - a.votes || a.nominee_name.localeCompare(b.nominee_name));
      const winner = nominees[0] || { nominee_user_id: '', nominee_name: 'Pending', votes: 0 };
      results.push({ role_name, total_votes: nominees.reduce((sum, item) => sum + item.votes, 0), winner_user_id: winner.nominee_user_id, winner_name: winner.nominee_name, nominees });
    });
    return results.sort((a, b) => a.role_name.localeCompare(b.role_name));
  },

  async publishResults(electionId: string, termStart: string, termEnd: string, user: AuthUser) {
    if (user.type !== 'admin') throw new Error('Only admin can publish election results.');
    const results = this.calculateResults(electionId);
    const assignments = results
      .filter((result) => result.winner_user_id)
      .map((result) => ({
        assignment_id: generateId('TERM'),
        election_id: electionId,
        role_name: result.role_name,
        user_id: result.winner_user_id,
        user_name: result.winner_name,
        term_start: termStart,
        term_end: termEnd,
        assigned_at: new Date().toISOString(),
        source_vote_count: result.nominees[0]?.votes || 0,
      } satisfies ElectionTermRecord));

    write(STORAGE.terms, [...assignments, ...this.getTerms()]);
    const updatedElections = this.getElections().map((item) => item.election_id === electionId ? { ...item, status: 'closed', results_published_at: new Date().toISOString() } : item);
    write(STORAGE.elections, updatedElections);
    await Promise.all(assignments.map((item) => safeSyncRow('add', SHEETS.terms, item)));
    const changedElection = updatedElections.find((item) => item.election_id === electionId);
    if (changedElection) await safeSyncRow('update', SHEETS.elections, changedElection);
    appendAudit({
      audit_id: generateId('EAUD'),
      module: 'elections',
      entity_type: 'election',
      entity_id: electionId,
      action: 'publish_results',
      actor_id: getActorId(user),
      actor_name: getActorName(user),
      timestamp: new Date().toISOString(),
      details: JSON.stringify({ termStart, termEnd, assignments: assignments.length }),
    });
    return assignments;
  },
};

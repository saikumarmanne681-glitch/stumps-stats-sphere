import { getActorId, getActorName } from '@/lib/accessControl';
import { compareTimestampsDesc } from '@/lib/time';
import { AuthUser } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { logAudit, v2api } from '@/lib/v2api';
import { TournamentAuditLog, TournamentRegistryRecord } from './types';

const STORAGE = {
  tournaments: 'club:tournaments:registry',
  audit: 'club:tournaments:audit',
} as const;

const SHEETS = {
  tournaments: 'tournaments_v2',
} as const;

const read = <T,>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T[] : [];
  } catch {
    return [];
  }
};

const write = <T,>(key: string, data: T[]) => localStorage.setItem(key, JSON.stringify(data));

function appendAudit(entry: TournamentAuditLog) {
  const items = read<TournamentAuditLog>(STORAGE.audit);
  items.unshift(entry);
  write(STORAGE.audit, items.slice(0, 500));
  logAudit(entry.actor_id, entry.action, entry.entity_type, entry.entity_id, entry.details);
}

async function safeSyncRow<T>(method: 'add' | 'update' | 'delete', sheet: string, row: T) {
  try {
    await v2api.syncHeaders().catch(() => false);
    if (method === 'add') return await v2api.addCustomSheetRow(sheet, row);
    if (method === 'delete') return await v2api.deleteCustomSheetRow(sheet, row);
    return await v2api.updateCustomSheetRow(sheet, row);
  } catch {
    return false;
  }
}

export const tournamentService = {
  getTables() {
    return ['tournaments_v2'] as const;
  },
  async syncFromBackend() {
    try {
      await v2api.syncHeaders().catch(() => false);
      const tournaments = await v2api.getCustomSheet<TournamentRegistryRecord>(SHEETS.tournaments);
      if (tournaments.length) write(STORAGE.tournaments, tournaments);
    } catch {
      // local cache remains the fallback
    }
  },
  getTournaments() {
    return read<TournamentRegistryRecord>(STORAGE.tournaments).sort((a, b) => compareTimestampsDesc(a.created_at, b.created_at));
  },
  getAuditLogs() {
    return read<TournamentAuditLog>(STORAGE.audit);
  },

  async clearAllData(user: AuthUser) {
    if (user.type !== 'admin') throw new Error('Only admin can clear tournament data.');
    const tournaments = this.getTournaments();

    write(STORAGE.tournaments, []);
    write(STORAGE.audit, []);

    await Promise.allSettled([
      ...tournaments.map((item) => safeSyncRow('delete', SHEETS.tournaments, { tournament_id: item.tournament_id })),
    ]);

    appendAudit({ audit_id: generateId('TAUD'), module: 'tournaments', entity_type: 'system', entity_id: 'all', action: 'clear_all_tournament_data', actor_id: getActorId(user), actor_name: getActorName(user), timestamp: new Date().toISOString(), details: JSON.stringify({ tournaments: tournaments.length }) });
  },
  async createTournament(input: Omit<TournamentRegistryRecord, 'tournament_id' | 'created_at'>, user: AuthUser) {
    const record: TournamentRegistryRecord = { ...input, tournament_id: generateId('TRN'), created_at: new Date().toISOString() };
    write(STORAGE.tournaments, [record, ...this.getTournaments()]);
    await safeSyncRow('add', SHEETS.tournaments, record);
    appendAudit({ audit_id: generateId('TAUD'), module: 'tournaments', entity_type: 'tournament', entity_id: record.tournament_id, action: 'create_tournament', actor_id: getActorId(user), actor_name: getActorName(user), timestamp: new Date().toISOString(), details: JSON.stringify({ name: record.name, format: record.format, status: record.status, source_type: record.source_type }) });
    return record;
  },
  async updateTournament(record: TournamentRegistryRecord, user: AuthUser) {
    const updated = this.getTournaments().map((item) => item.tournament_id === record.tournament_id ? record : item);
    write(STORAGE.tournaments, updated);
    await safeSyncRow('update', SHEETS.tournaments, record);
    appendAudit({ audit_id: generateId('TAUD'), module: 'tournaments', entity_type: 'tournament', entity_id: record.tournament_id, action: 'update_tournament', actor_id: getActorId(user), actor_name: getActorName(user), timestamp: new Date().toISOString(), details: JSON.stringify({ name: record.name, status: record.status, source_type: record.source_type }) });
    return record;
  },
  async deleteTournament(tournamentId: string, user: AuthUser) {
    write(STORAGE.tournaments, this.getTournaments().filter((item) => item.tournament_id !== tournamentId));
    await safeSyncRow('delete', SHEETS.tournaments, { tournament_id: tournamentId });
    appendAudit({ audit_id: generateId('TAUD'), module: 'tournaments', entity_type: 'tournament', entity_id: tournamentId, action: 'delete_tournament', actor_id: getActorId(user), actor_name: getActorName(user), timestamp: new Date().toISOString(), details: JSON.stringify({ tournamentId }) });
  },
};

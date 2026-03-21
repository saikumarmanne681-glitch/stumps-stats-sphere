import { getActorId, getActorName } from '@/lib/accessControl';
import { AuthUser } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { logAudit, v2api } from '@/lib/v2api';
import { RegistrationRecord, TournamentAuditLog, TournamentRegistryRecord } from './types';

function normalizeText(value: string) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildRegistrationKey(input: Pick<RegistrationRecord, 'tournament_id' | 'season_id' | 'team_name'>) {
  return [String(input.tournament_id || '').trim(), String(input.season_id || 'NA').trim(), normalizeText(input.team_name)].join('::');
}

const STORAGE = {
  tournaments: 'club:tournaments:registry',
  registrations: 'club:tournaments:registrations',
  audit: 'club:tournaments:audit',
} as const;

const SHEETS = {
  tournaments: 'tournaments_v2',
  registrations: 'registrations',
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

async function safeSyncRow<T>(method: 'add' | 'update', sheet: string, row: T) {
  try {
    await v2api.syncHeaders().catch(() => false);
    if (method === 'add') return await v2api.addCustomSheetRow(sheet, row);
    return await v2api.updateCustomSheetRow(sheet, row);
  } catch {
    return false;
  }
}

export const tournamentService = {
  getTables() {
    return ['tournaments_v2', 'registrations'] as const;
  },
  async syncFromBackend() {
    try {
      await v2api.syncHeaders().catch(() => false);
      const [tournaments, registrations] = await Promise.all([
        v2api.getCustomSheet<TournamentRegistryRecord>(SHEETS.tournaments),
        v2api.getCustomSheet<RegistrationRecord>(SHEETS.registrations),
      ]);
      if (tournaments.length) write(STORAGE.tournaments, tournaments);
      if (registrations.length) write(STORAGE.registrations, registrations.map((item) => ({ ...item, registration_key: item.registration_key || buildRegistrationKey(item) })));
    } catch {
      // local cache remains the fallback
    }
  },
  getTournaments() {
    return read<TournamentRegistryRecord>(STORAGE.tournaments).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  getRegistrations() {
    return read<RegistrationRecord>(STORAGE.registrations)
      .map((item) => ({ ...item, registration_key: item.registration_key || buildRegistrationKey(item) }))
      .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
  },
  getAuditLogs() {
    return read<TournamentAuditLog>(STORAGE.audit);
  },
  async createTournament(input: Omit<TournamentRegistryRecord, 'tournament_id' | 'created_at'>, user: AuthUser) {
    const record: TournamentRegistryRecord = { ...input, tournament_id: generateId('TRN'), created_at: new Date().toISOString() };
    write(STORAGE.tournaments, [record, ...this.getTournaments()]);
    await safeSyncRow('add', SHEETS.tournaments, record);
    appendAudit({ audit_id: generateId('TAUD'), module: 'tournaments', entity_type: 'tournament', entity_id: record.tournament_id, action: 'create_tournament', actor_id: getActorId(user), actor_name: getActorName(user), timestamp: new Date().toISOString(), details: JSON.stringify({ name: record.name, format: record.format, status: record.status }) });
    return record;
  },
  isDuplicateRegistration(input: Pick<RegistrationRecord, 'tournament_id' | 'season_id' | 'team_name'>, ignoreRegistrationId?: string) {
    const registrationKey = buildRegistrationKey(input);
    return this.getRegistrations().some((item) => item.registration_id !== ignoreRegistrationId && (item.registration_key || buildRegistrationKey(item)) === registrationKey);
  },
  async submitRegistration(input: Omit<RegistrationRecord, 'registration_id' | 'submitted_at' | 'status' | 'reviewed_by' | 'reviewed_at' | 'review_notes' | 'registration_key'>, user: AuthUser) {
    const registration_key = buildRegistrationKey(input);
    if (this.isDuplicateRegistration(input)) {
      throw new Error('A registration for this team already exists for the selected tournament season.');
    }
    const record: RegistrationRecord = { ...input, registration_key, registration_id: generateId('REG'), submitted_at: new Date().toISOString(), status: 'pending', reviewed_by: '', reviewed_at: '', review_notes: '' };
    write(STORAGE.registrations, [record, ...this.getRegistrations()]);
    await safeSyncRow('add', SHEETS.registrations, record);
    appendAudit({ audit_id: generateId('TAUD'), module: 'tournaments', entity_type: 'registration', entity_id: record.registration_id, action: 'submit_registration', actor_id: getActorId(user), actor_name: getActorName(user), timestamp: new Date().toISOString(), details: JSON.stringify({ tournamentId: record.tournament_id, seasonId: record.season_id || '', teamName: record.team_name, registrationKey: record.registration_key }) });
    return record;
  },
  async reviewRegistration(registrationId: string, status: 'approved' | 'rejected', reviewNotes: string, user: AuthUser) {
    const updated = this.getRegistrations().map((item) => item.registration_id === registrationId ? { ...item, status, review_notes: reviewNotes, reviewed_by: getActorId(user), reviewed_at: new Date().toISOString() } : item);
    write(STORAGE.registrations, updated);
    const changed = updated.find((item) => item.registration_id === registrationId);
    if (changed) await safeSyncRow('update', SHEETS.registrations, changed);
    appendAudit({ audit_id: generateId('TAUD'), module: 'tournaments', entity_type: 'registration', entity_id: registrationId, action: `registration_${status}`, actor_id: getActorId(user), actor_name: getActorName(user), timestamp: new Date().toISOString(), details: JSON.stringify({ reviewNotes }) });
  },
};

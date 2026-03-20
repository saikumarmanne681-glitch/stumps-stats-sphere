import { getActorId, getActorName } from '@/lib/accessControl';
import { AuthUser } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { logAudit } from '@/lib/v2api';
import { RegistrationRecord, TournamentAuditLog, TournamentRegistryRecord } from './types';

const STORAGE = {
  tournaments: 'club:tournaments:registry',
  registrations: 'club:tournaments:registrations',
  audit: 'club:tournaments:audit',
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

export const tournamentService = {
  getTables() {
    return ['tournaments', 'registrations'] as const;
  },
  getTournaments() {
    return read<TournamentRegistryRecord>(STORAGE.tournaments).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  getRegistrations() {
    return read<RegistrationRecord>(STORAGE.registrations).sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
  },
  getAuditLogs() {
    return read<TournamentAuditLog>(STORAGE.audit);
  },
  createTournament(input: Omit<TournamentRegistryRecord, 'tournament_id' | 'created_at'>, user: AuthUser) {
    const record: TournamentRegistryRecord = { ...input, tournament_id: generateId('TRN'), created_at: new Date().toISOString() };
    write(STORAGE.tournaments, [record, ...this.getTournaments()]);
    appendAudit({ audit_id: generateId('TAUD'), module: 'tournaments', entity_type: 'tournament', entity_id: record.tournament_id, action: 'create_tournament', actor_id: getActorId(user), actor_name: getActorName(user), timestamp: new Date().toISOString(), details: JSON.stringify({ name: record.name, format: record.format, status: record.status }) });
    return record;
  },
  submitRegistration(input: Omit<RegistrationRecord, 'registration_id' | 'submitted_at' | 'status' | 'reviewed_by' | 'reviewed_at' | 'review_notes'>, user: AuthUser) {
    const record: RegistrationRecord = { ...input, registration_id: generateId('REG'), submitted_at: new Date().toISOString(), status: 'pending', reviewed_by: '', reviewed_at: '', review_notes: '' };
    write(STORAGE.registrations, [record, ...this.getRegistrations()]);
    appendAudit({ audit_id: generateId('TAUD'), module: 'tournaments', entity_type: 'registration', entity_id: record.registration_id, action: 'submit_registration', actor_id: getActorId(user), actor_name: getActorName(user), timestamp: new Date().toISOString(), details: JSON.stringify({ tournamentId: record.tournament_id, teamName: record.team_name }) });
    return record;
  },
  reviewRegistration(registrationId: string, status: 'approved' | 'rejected', reviewNotes: string, user: AuthUser) {
    const updated = this.getRegistrations().map((item) => item.registration_id === registrationId ? { ...item, status, review_notes: reviewNotes, reviewed_by: getActorId(user), reviewed_at: new Date().toISOString() } : item);
    write(STORAGE.registrations, updated);
    appendAudit({ audit_id: generateId('TAUD'), module: 'tournaments', entity_type: 'registration', entity_id: registrationId, action: `registration_${status}`, actor_id: getActorId(user), actor_name: getActorName(user), timestamp: new Date().toISOString(), details: JSON.stringify({ reviewNotes }) });
  },
};

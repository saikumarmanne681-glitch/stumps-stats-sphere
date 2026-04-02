import { ManagementUser } from './v2types';

export const CERTIFICATE_TYPES = [
  'Man of the Match',
  'Man of the Tournament',
  'Tournament Winner',
  'Tournament Runner',
  'Best Batsman',
  'Best Bowler',
] as const;

export type CertificateType = (typeof CERTIFICATE_TYPES)[number] | string;
export type CertificateStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'REJECTED' | 'APPROVED' | 'CERTIFIED';
export type ApprovalDecision = 'pending' | 'approved' | 'rejected';
export type ApproverRole = 'treasurer' | 'referee' | 'tournament_director';

export interface CertificateRecord {
  id: string;
  type: CertificateType;
  tournament: string;
  season: string;
  match_id: string;
  recipient_type: 'player' | 'team';
  recipient_id: string;
  recipient_name: string;
  linked_player_id?: string;
  linked_team_name?: string;
  template_id: string;
  status: CertificateStatus;
  created_by: string;
  created_at: string;
  details_json?: string;
  performance_json?: string;
  verification_code?: string;
  certified_at?: string;
  certified_by?: string;
}

export interface CertificateApprovalRecord {
  certificate_id: string;
  role: ApproverRole;
  status: ApprovalDecision;
  approved_by: string;
  approved_at: string;
  remarks?: string;
}

export interface CertificateTemplateRecord {
  template_id: string;
  type: string;
  template_name: string;
  image_url: string;
  design_config: string;
}

export interface ApprovalStatusByRole {
  treasurer: ApprovalDecision;
  referee: ApprovalDecision;
  tournament_director: ApprovalDecision;
}

export const APPROVER_ROLES: ApproverRole[] = ['treasurer', 'referee', 'tournament_director'];

export function emptyApprovalStatus(): ApprovalStatusByRole {
  return { treasurer: 'pending', referee: 'pending', tournament_director: 'pending' };
}

export function mapDesignationToApproverRole(designation?: string, role?: string): ApproverRole | null {
  const value = `${String(designation || '')} ${String(role || '')}`.trim().toLowerCase();
  if (!value) return null;
  if (value.includes('treasurer')) return 'treasurer';
  if (value.includes('referee') || value.includes('umpire')) return 'referee';
  if (
    value.includes('tournament director')
    || value.includes('tournament_director')
    || value.includes('tournamentdirector')
    || value.includes('director')
  ) return 'tournament_director';
  return null;
}

export function normalizeCertificateStatus(value?: string | null): CertificateStatus | null {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'DRAFT') return 'DRAFT';
  if (normalized === 'PENDING_APPROVAL') return 'PENDING_APPROVAL';
  if (normalized === 'REJECTED') return 'REJECTED';
  if (normalized === 'APPROVED') return 'APPROVED';
  if (normalized === 'CERTIFIED') return 'CERTIFIED';
  return null;
}

export function normalizeApproverRole(value?: string | null): ApproverRole | null {
  const normalized = String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (normalized === 'treasurer') return 'treasurer';
  if (normalized === 'referee' || normalized === 'umpire') return 'referee';
  if (normalized === 'tournament_director' || normalized === 'director') return 'tournament_director';
  return null;
}

export function normalizeApprovalDecision(value?: string | null): ApprovalDecision {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'approved') return 'approved';
  if (normalized === 'rejected') return 'rejected';
  return 'pending';
}

export function deriveApprovalStatus(rows: CertificateApprovalRecord[]): ApprovalStatusByRole {
  const next = emptyApprovalStatus();
  rows.forEach((row) => {
    const role = normalizeApproverRole(row.role);
    if (!role) return;
    next[role] = normalizeApprovalDecision(row.status);
  });
  return next;
}

export function canFinalize(status: ApprovalStatusByRole): boolean {
  return APPROVER_ROLES.every((role) => status[role] === 'approved');
}

export function approverLabel(role: ApproverRole) {
  if (role === 'tournament_director') return 'Tournament Director';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function getApproversByRole(users: ManagementUser[]) {
  return users.reduce<Record<ApproverRole, ManagementUser[]>>((acc, user) => {
    const role = mapDesignationToApproverRole(user.designation, user.role);
    if (!role) return acc;
    acc[role].push(user);
    return acc;
  }, { treasurer: [], referee: [], tournament_director: [] });
}

export function normalizeCertificateId(value?: string | null): string {
  return String(value || '').trim().toUpperCase();
}

export function isCertificateCertified(certificate?: Partial<CertificateRecord> | null): boolean {
  return String(certificate?.status || '').trim().toUpperCase() === 'CERTIFIED';
}

export function isCertificateAuthentic(certificate?: Partial<CertificateRecord> | null): boolean {
  if (!certificate) return false;
  const certified = isCertificateCertified(certificate);
  const hasCertifiedAt = Boolean(String(certificate.certified_at || '').trim());
  const hasCertifiedBy = Boolean(String(certificate.certified_by || '').trim());
  const hasVerificationCode = Boolean(String(certificate.verification_code || '').trim());
  return certified && hasCertifiedAt && hasCertifiedBy && hasVerificationCode;
}

type GenericRow = Record<string, unknown>;

const firstString = (...values: unknown[]): string => {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
};

export function normalizeCertificateRecord(raw: Partial<CertificateRecord> | GenericRow): CertificateRecord {
  const row = raw as GenericRow;
  const id = firstString(row.id, row.certificate_id, row.cert_id, row.certificateId) || `CERT-${Date.now()}`;
  const linkedPlayerId = firstString(row.linked_player_id, row.player_id, row.playerId);
  const linkedTeamName = firstString(row.linked_team_name, row.team_name, row.team, row.teamName);
  const recipientName = firstString(row.recipient_name, row.player_name, row.team_name, row.recipient);
  const recipientTypeRaw = firstString(row.recipient_type).toLowerCase();
  const recipientType: CertificateRecord['recipient_type'] = recipientTypeRaw === 'team' || (!!linkedTeamName && !linkedPlayerId) ? 'team' : 'player';
  const recipientId = firstString(
    row.recipient_id,
    row.linked_player_id,
    row.player_id,
    row.linked_team_name,
    row.team_name,
  );
  const status = normalizeCertificateStatus(firstString(row.status)) || 'DRAFT';
  return {
    id,
    type: firstString(row.type, row.certificate_type, row.title) || 'Certificate of Excellence',
    tournament: firstString(row.tournament, row.tournament_name, row.competition_name) || 'Tournament',
    season: firstString(row.season, row.season_year, row.year) || 'Season',
    match_id: firstString(row.match_id, row.match, row.matchId),
    recipient_type: recipientType,
    recipient_id: recipientId,
    recipient_name: recipientName || (recipientType === 'team' ? linkedTeamName : linkedPlayerId) || 'Recipient',
    linked_player_id: linkedPlayerId,
    linked_team_name: linkedTeamName,
    template_id: firstString(row.template_id, row.template, row.template_name) || 'TPL_CLASSIC_GOLD',
    status,
    created_by: firstString(row.created_by, row.createdBy) || 'admin',
    created_at: firstString(row.created_at, row.createdAt, row.issued_at),
    details_json: firstString(row.details_json, row.details, row.match_details),
    performance_json: firstString(row.performance_json, row.performance, row.stats),
    verification_code: firstString(row.verification_code, row.verify_code, row.verificationCode),
    certified_at: firstString(row.certified_at, row.approved_at, row.certifiedAt),
    certified_by: firstString(row.certified_by, row.approved_by, row.certifiedBy),
  };
}

export function certificateMatchesPlayer(certificate: Partial<CertificateRecord>, playerId: string): boolean {
  const normalized = normalizeCertificateRecord(certificate);
  const target = String(playerId || '').trim().toLowerCase();
  return Boolean(target) && (
    (normalized.recipient_type === 'player' && normalized.recipient_id.trim().toLowerCase() === target)
    || String(normalized.linked_player_id || '').trim().toLowerCase() === target
  );
}

export function certificateMatchesTeam(certificate: Partial<CertificateRecord>, teamName: string): boolean {
  const normalized = normalizeCertificateRecord(certificate);
  const target = String(teamName || '').trim().toLowerCase();
  if (!target) return false;
  const recipientId = String(normalized.recipient_id || '').trim().toLowerCase();
  const recipientName = String(normalized.recipient_name || '').trim().toLowerCase();
  const linkedTeam = String(normalized.linked_team_name || '').trim().toLowerCase();
  return normalized.recipient_type === 'team' && (
    recipientName === target
    || recipientId === target
    || linkedTeam === target
  );
}

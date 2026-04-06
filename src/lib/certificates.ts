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

export function normalizeCertificateTemplateId(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function buildCertificateTemplateMap(templates: CertificateTemplateRecord[]) {
  const exact: Record<string, CertificateTemplateRecord> = {};
  const normalized = new Map<string, CertificateTemplateRecord>();
  templates.forEach((template) => {
    const key = String(template.template_id || '').trim();
    if (key) exact[key] = template;
    const normalizedKey = normalizeCertificateTemplateId(key);
    if (normalizedKey && !normalized.has(normalizedKey)) {
      normalized.set(normalizedKey, template);
    }
    const normalizedName = normalizeCertificateTemplateId(template.template_name);
    if (normalizedName && !normalized.has(normalizedName)) {
      normalized.set(normalizedName, template);
    }
  });
  return { exact, normalized };
}

export function resolveCertificateTemplate(
  certificate: Partial<CertificateRecord> | null | undefined,
  templateMap: { exact: Record<string, CertificateTemplateRecord>; normalized: Map<string, CertificateTemplateRecord> },
): CertificateTemplateRecord | undefined {
  const templateId = String(certificate?.template_id || '').trim();
  if (!templateId) return undefined;
  return (
    templateMap.exact[templateId]
    || templateMap.normalized.get(normalizeCertificateTemplateId(templateId))
  );
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
  const compact = normalized.replace(/[\s-]+/g, '_');
  if (normalized === 'DRAFT') return 'DRAFT';
  if (normalized === 'PENDING_APPROVAL') return 'PENDING_APPROVAL';
  if (normalized === 'REJECTED') return 'REJECTED';
  if (normalized === 'APPROVED') return 'APPROVED';
  if (normalized === 'CERTIFIED') return 'CERTIFIED';
  if (compact === 'PENDING_APPROVAL') return 'PENDING_APPROVAL';
  if (compact === 'IN_REVIEW') return 'PENDING_APPROVAL';
  if (compact === 'CERTIFICATE_CERTIFIED' || compact === 'FULLY_CERTIFIED') return 'CERTIFIED';
  if (normalized.includes('CERTIFIED')) return 'CERTIFIED';
  if (normalized.includes('APPROVED')) return 'APPROVED';
  if (normalized.includes('REJECTED')) return 'REJECTED';
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
  return normalizeCertificateStatus(String(certificate?.status || '')) === 'CERTIFIED';
}

export function isCertificateAuthentic(certificate?: Partial<CertificateRecord> | null): boolean {
  if (!certificate) return false;
  const normalized = normalizeCertificateRecord(certificate);
  const certified = isCertificateCertified(normalized);
  const hasCertifiedAt = Boolean(String(normalized.certified_at || '').trim());
  const hasCertifiedBy = Boolean(String(normalized.certified_by || '').trim());
  const hasVerificationCode = Boolean(String(normalized.verification_code || '').trim());
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

const looksTimestamp = (value: unknown): boolean => {
  const text = String(value ?? '').trim();
  return !!text && Number.isFinite(new Date(text).getTime());
};

const looksRecipientType = (value: unknown): boolean => {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'player' || normalized === 'team';
};

export function normalizeCertificateRecord(raw: Partial<CertificateRecord> | GenericRow): CertificateRecord {
  const row = raw as GenericRow;
  const id = firstString(row.id, row.certificate_id, row.cert_id, row.certificateId) || `CERT-${Date.now()}`;
  const legacyRecipientType = looksRecipientType(row.match_id) && !looksRecipientType(row.recipient_type)
    ? String(row.match_id).trim().toLowerCase()
    : '';
  const linkedPlayerId = firstString(
    row.linked_player_id,
    legacyRecipientType === 'player' ? row.recipient_name : '',
    row.player_id,
    row.playerId,
  );
  const linkedTeamName = firstString(
    row.linked_team_name,
    legacyRecipientType === 'team' ? row.recipient_name : '',
    row.team_name,
    row.team,
    row.teamName,
  );
  const recipientName = firstString(
    legacyRecipientType ? row.recipient_id : '',
    row.recipient_name,
    row.player_name,
    row.team_name,
    row.recipient,
  );
  const recipientTypeRaw = firstString(legacyRecipientType, row.recipient_type).toLowerCase();
  const recipientType: CertificateRecord['recipient_type'] = recipientTypeRaw === 'team' || (!!linkedTeamName && !linkedPlayerId) ? 'team' : 'player';
  const recipientId = firstString(
    legacyRecipientType ? row.recipient_type : '',
    row.recipient_id,
    row.linked_player_id,
    row.player_id,
    row.linked_team_name,
    row.team_name,
  );

  const inferredStatus = normalizeCertificateStatus(
    firstString(row.status, row.certificate_status, row.certification_status, row.qr_payload, row.approval_status),
  );
  const hasLegacyApprovedAt = looksTimestamp(row.approved_at) || looksTimestamp(row.certified_at);
  const hasLegacyVerificationCode = Boolean(firstString(row.verification_code, row.verify_code, row.verificationCode, row.generated_at));
  const status = inferredStatus || (hasLegacyApprovedAt && hasLegacyVerificationCode ? 'CERTIFIED' : 'DRAFT');

  return {
    id,
    type: firstString(row.type, row.certificate_type, row.title) || 'Certificate of Excellence',
    tournament: firstString(row.tournament, row.tournament_name, row.competition_name, row.title, row.tournament_id) || 'Tournament',
    season: firstString(row.season, row.season_year, row.season_id, row.year) || 'Season',
    match_id: legacyRecipientType ? '' : firstString(row.match_id, row.match, row.matchId),
    recipient_type: recipientType,
    recipient_id: recipientId,
    recipient_name: recipientName || (recipientType === 'team' ? linkedTeamName : linkedPlayerId) || 'Recipient',
    linked_player_id: linkedPlayerId,
    linked_team_name: linkedTeamName,
    template_id: firstString(row.template_id, row.certificate_html, row.template, row.template_name) || 'TPL_CLASSIC_GOLD',
    status,
    created_by: firstString(row.created_by, !looksTimestamp(row.security_hash) ? row.security_hash : '', row.createdBy, row.delivery_status) || 'admin',
    created_at: firstString(row.created_at, looksTimestamp(row.approval_status) ? row.approval_status : '', row.createdAt, row.issued_at),
    details_json: firstString(row.details_json, row.details, row.match_details, row.approvals_json),
    performance_json: firstString(row.performance_json, row.performance, row.stats, row.generated_by),
    verification_code: firstString(row.verification_code, row.verify_code, row.verificationCode, row.generated_at),
    certified_at: firstString(row.certified_at, row.approved_at, row.certifiedAt),
    certified_by: firstString(row.certified_by, row.approved_by, row.certifiedBy, !looksTimestamp(row.delivery_status) ? row.delivery_status : ''),
  };
}

export function certificateMatchesPlayer(certificate: Partial<CertificateRecord>, playerId: string): boolean {
  const normalized = normalizeCertificateRecord(certificate);
  const target = normalizeCertificateIdentity(playerId);
  const recipientId = normalizeCertificateIdentity(normalized.recipient_id);
  const linkedPlayerId = normalizeCertificateIdentity(normalized.linked_player_id);
  return Boolean(target) && (
    (normalized.recipient_type === 'player' && recipientId === target)
    || linkedPlayerId === target
  );
}

export function certificateMatchesTeam(certificate: Partial<CertificateRecord>, teamName: string): boolean {
  const normalized = normalizeCertificateRecord(certificate);
  const target = normalizeCertificateIdentity(teamName);
  if (!target) return false;
  const recipientId = normalizeCertificateIdentity(normalized.recipient_id);
  const recipientName = normalizeCertificateIdentity(normalized.recipient_name);
  const linkedTeam = normalizeCertificateIdentity(normalized.linked_team_name);
  if (linkedTeam === target) return true;
  return normalized.recipient_type === 'team' && (
    recipientName === target
    || recipientId === target
    || linkedTeam === target
  );
}

function normalizeCertificateIdentity(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

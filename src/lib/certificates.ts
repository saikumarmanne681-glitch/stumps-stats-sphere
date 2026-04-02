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

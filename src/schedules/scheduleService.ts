import { canApproveSchedule, getActorId, getActorName, isScheduleApproverRole, scheduleApproverRoles } from '@/lib/accessControl';
import { AuthUser } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { logAudit } from '@/lib/v2api';
import { ScheduleApprovalRecord, ScheduleAuditLog, ScheduleDiffEntry, ScheduleMatch, ScheduleRecord } from './types';

const STORAGE = {
  schedules: 'club:schedules',
  approvals: 'club:schedules:approvals',
  audit: 'club:schedules:audit',
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

async function digest(input: string) {
  const bytes = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function appendAudit(entry: ScheduleAuditLog) {
  const items = read<ScheduleAuditLog>(STORAGE.audit);
  items.unshift(entry);
  write(STORAGE.audit, items.slice(0, 500));
  logAudit(entry.actor_id, entry.action, entry.entity_type, entry.entity_id, entry.details);
}

function keyForMatch(match: ScheduleMatch) {
  return match.match_id || `${match.date}:${match.time}:${match.team_a}:${match.team_b}`;
}

function textLines(schedule: ScheduleRecord, approvals: ScheduleApprovalRecord[]) {
  const matches = JSON.parse(schedule.matches_json) as ScheduleMatch[];
  return [
    `%PDF-1.3`,
    `1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj`,
    `2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj`,
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj`,
    `4 0 obj << /Length 5 0 R >> stream`,
    `BT /F1 10 Tf 40 760 Td 14 TL (${`Tournament: ${schedule.tournament_name}`.replace(/[()]/g, '')}) Tj T* (${`Version: ${schedule.version_number}`.replace(/[()]/g, '')}) Tj T* (${`Status: ${schedule.status}`.replace(/[()]/g, '')}) Tj T* (${`Timestamp: ${schedule.timestamp}`.replace(/[()]/g, '')}) Tj T* (${`Hash: ${schedule.hash}`.slice(0, 80).replace(/[()]/g, '')}) Tj T* (${`Approvals: ${approvals.filter((item) => item.decision === 'approved').map((item) => `${item.approver_name} (${item.approver_role})`).join(', ') || 'Pending'}`.replace(/[()]/g, '')}) Tj T* ${matches.slice(0, 20).map((match) => `(${`${match.date} ${match.time} ${match.team_a} vs ${match.team_b} @ ${match.venue}`.replace(/[()]/g, '')}) Tj T*`).join(' ')} ET`,
    `endstream endobj`,
    `${String(0).length} 0 obj ${String(0)}`,
    `5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`,
    `xref`,
    `0 6`,
    `0000000000 65535 f `,
    `trailer << /Root 1 0 R /Size 6 >>`,
    `startxref`,
    `0`,
    `%%EOF`,
  ].join('\n');
}

export const scheduleService = {
  getTables() {
    return ['schedules', 'approvals'] as const;
  },
  getSchedules() {
    return read<ScheduleRecord>(STORAGE.schedules).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },
  getApprovals() {
    return read<ScheduleApprovalRecord>(STORAGE.approvals).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },
  getAuditLogs() {
    return read<ScheduleAuditLog>(STORAGE.audit);
  },
  async createVersion(input: { tournament_id: string; tournament_name: string; matches: ScheduleMatch[]; change_log: string }, user: AuthUser) {
    const previousVersions = this.getSchedules().filter((item) => item.tournament_id === input.tournament_id).sort((a, b) => b.version_number - a.version_number);
    const version_number = (previousVersions[0]?.version_number || 0) + 1;
    const hash = await digest(JSON.stringify({ tournamentId: input.tournament_id, version_number, matches: input.matches, createdBy: getActorId(user), timestamp: Date.now() }));
    const record: ScheduleRecord = {
      schedule_id: generateId('SCH'),
      tournament_id: input.tournament_id,
      tournament_name: input.tournament_name,
      version_number,
      matches_json: JSON.stringify(input.matches),
      created_by: getActorId(user),
      created_by_name: getActorName(user),
      timestamp: new Date().toISOString(),
      change_log: input.change_log,
      status: 'draft',
      parent_schedule_id: previousVersions[0]?.schedule_id || '',
      hash,
      rejection_reason: '',
    };
    write(STORAGE.schedules, [record, ...this.getSchedules()]);
    appendAudit({ audit_id: generateId('SAUD'), module: 'schedules', entity_type: 'schedule', entity_id: record.schedule_id, action: 'create_schedule_version', actor_id: getActorId(user), actor_name: getActorName(user), timestamp: new Date().toISOString(), details: JSON.stringify({ tournamentId: record.tournament_id, version: version_number, matches: input.matches.length }) });
    return record;
  },
  submitForApproval(scheduleId: string, user: AuthUser) {
    write(STORAGE.schedules, this.getSchedules().map((item) => item.schedule_id === scheduleId ? { ...item, status: 'pending_approval', rejection_reason: '' } : item));
    appendAudit({ audit_id: generateId('SAUD'), module: 'schedules', entity_type: 'schedule', entity_id: scheduleId, action: 'submit_schedule_for_approval', actor_id: getActorId(user), actor_name: getActorName(user), timestamp: new Date().toISOString(), details: JSON.stringify({ status: 'pending_approval' }) });
  },
  approveSchedule(scheduleId: string, comments: string, user: AuthUser) {
    if (!canApproveSchedule(user) || !isScheduleApproverRole(user.designation)) throw new Error('Only authorized office bearers can approve schedules.');
    const existing = this.getApprovals().find((item) => item.schedule_id === scheduleId && item.approver_id === getActorId(user));
    if (existing) throw new Error('You have already submitted an approval for this schedule version.');

    const approval: ScheduleApprovalRecord = {
      approval_id: generateId('APR'),
      schedule_id: scheduleId,
      approver_id: getActorId(user),
      approver_name: getActorName(user),
      approver_role: user.designation || 'Management',
      decision: 'approved',
      comments,
      timestamp: new Date().toISOString(),
    };
    write(STORAGE.approvals, [approval, ...this.getApprovals()]);

    const approvals = this.getApprovals().filter((item) => item.schedule_id === scheduleId && item.decision === 'approved');
    const approvedRoles = new Set(approvals.map((item) => item.approver_role));
    const fullyApproved = scheduleApproverRoles.every((role) => approvedRoles.has(role));

    write(STORAGE.schedules, this.getSchedules().map((item) => item.schedule_id === scheduleId ? { ...item, status: fullyApproved ? 'approved' : item.status } : item));
    appendAudit({ audit_id: generateId('SAUD'), module: 'schedules', entity_type: 'approval', entity_id: approval.approval_id, action: 'approve_schedule', actor_id: getActorId(user), actor_name: getActorName(user), timestamp: new Date().toISOString(), details: JSON.stringify({ scheduleId, approverRole: approval.approver_role, fullyApproved }) });
    return approval;
  },
  rejectSchedule(scheduleId: string, comments: string, user: AuthUser) {
    if (!canApproveSchedule(user) || !isScheduleApproverRole(user.designation)) throw new Error('Only authorized office bearers can reject schedules.');
    const approval: ScheduleApprovalRecord = {
      approval_id: generateId('APR'),
      schedule_id: scheduleId,
      approver_id: getActorId(user),
      approver_name: getActorName(user),
      approver_role: user.designation || 'Management',
      decision: 'rejected',
      comments,
      timestamp: new Date().toISOString(),
    };
    write(STORAGE.approvals, [approval, ...this.getApprovals()]);
    write(STORAGE.schedules, this.getSchedules().map((item) => item.schedule_id === scheduleId ? { ...item, status: 'draft', rejection_reason: comments } : item));
    appendAudit({ audit_id: generateId('SAUD'), module: 'schedules', entity_type: 'approval', entity_id: approval.approval_id, action: 'reject_schedule', actor_id: getActorId(user), actor_name: getActorName(user), timestamp: new Date().toISOString(), details: JSON.stringify({ scheduleId, comments }) });
    return approval;
  },
  getApprovedSchedulesForTournament(tournamentId: string) {
    return this.getSchedules().filter((item) => item.tournament_id === tournamentId && item.status === 'approved').sort((a, b) => b.version_number - a.version_number);
  },
  diffVersions(previous?: ScheduleRecord, current?: ScheduleRecord) {
    const previousMatches = new Map<string, ScheduleMatch>((previous ? JSON.parse(previous.matches_json) : [] as ScheduleMatch[]).map((match: ScheduleMatch) => [keyForMatch(match), match]));
    const currentMatches = new Map<string, ScheduleMatch>((current ? JSON.parse(current.matches_json) : [] as ScheduleMatch[]).map((match: ScheduleMatch) => [keyForMatch(match), match]));
    const allKeys = new Set([...previousMatches.keys(), ...currentMatches.keys()]);
    const diff: ScheduleDiffEntry[] = [];
    allKeys.forEach((key) => {
      const prev = previousMatches.get(key);
      const curr = currentMatches.get(key);
      if (!prev && curr) diff.push({ kind: 'added', match_id: key, current: curr });
      else if (prev && !curr) diff.push({ kind: 'removed', match_id: key, previous: prev });
      else if (prev && curr && JSON.stringify(prev) !== JSON.stringify(curr)) diff.push({ kind: 'updated', match_id: key, previous: prev, current: curr });
    });
    return diff;
  },
  downloadPdf(scheduleId: string) {
    const schedule = this.getSchedules().find((item) => item.schedule_id === scheduleId);
    if (!schedule) throw new Error('Schedule not found');
    const approvals = this.getApprovals().filter((item) => item.schedule_id === scheduleId && item.decision === 'approved');
    const content = textLines(schedule, approvals);
    const blob = new Blob([content], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${schedule.tournament_name.replace(/\s+/g, '-').toLowerCase()}-v${schedule.version_number}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  },
};

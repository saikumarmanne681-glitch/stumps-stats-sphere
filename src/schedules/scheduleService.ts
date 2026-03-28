import { canApproveSchedule, getActorId, getActorName, isScheduleApproverRole, scheduleApproverRoles } from '@/lib/accessControl';
import { AuthUser } from '@/lib/types';
import { generateId } from '@/lib/utils';
import { logAudit, v2api } from '@/lib/v2api';
import { ScheduleApprovalRecord, ScheduleAuditLog, ScheduleDiffEntry, ScheduleMatch, ScheduleRecord } from './types';
import { getScheduleDetailedStatus } from '@/lib/workflowStatus';
import { compareTimestampsDesc, formatInIST, formatScheduleSlotInIST, nowIso } from '@/lib/time';

const STORAGE = {
  schedules: 'club:schedules',
  approvals: 'club:schedules:approvals',
  audit: 'club:schedules:audit',
} as const;

const SHEETS = {
  schedules: 'schedules',
  approvals: 'approvals',
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

function dedupeByKey<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

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

function escapePdfText(value: string) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildSimplePdf(lines: string[]) {
  const textStream = `BT /F1 10 Tf 40 760 Td 14 TL ${lines.map((line) => `(${escapePdfText(line)}) Tj T*`).join(' ')} ET`;
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj',
    `4 0 obj << /Length ${textStream.length} >> stream\n${textStream}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
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

export const scheduleService = {
  getTables() {
    return ['schedules', 'approvals'] as const;
  },
  async syncFromBackend() {
    try {
      await v2api.syncHeaders().catch(() => false);
      const [schedules, approvals] = await Promise.all([
        v2api.getCustomSheet<ScheduleRecord>(SHEETS.schedules),
        v2api.getCustomSheet<ScheduleApprovalRecord>(SHEETS.approvals),
      ]);
      if (schedules.length) write(STORAGE.schedules, dedupeByKey(schedules, (item) => item.schedule_id));
      if (approvals.length) write(STORAGE.approvals, dedupeByKey(approvals, (item) => item.approval_id || `${item.schedule_id}:${item.approver_id}:${item.approver_role}`));
    } catch {
      // local cache remains the fallback
    }
  },
  getSchedules() {
    return read<ScheduleRecord>(STORAGE.schedules).sort((a, b) => compareTimestampsDesc(a.timestamp, b.timestamp));
  },
  getApprovals() {
    return read<ScheduleApprovalRecord>(STORAGE.approvals).sort((a, b) => compareTimestampsDesc(a.timestamp, b.timestamp));
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
      timestamp: nowIso(),
      change_log: input.change_log,
      status: 'draft',
      parent_schedule_id: previousVersions[0]?.schedule_id || '',
      hash,
      rejection_reason: '',
      assignee_id: getActorId(user),
      due_at: '',
      priority: 'medium',
      escalation_state: 'normal',
    };
    write(STORAGE.schedules, [record, ...this.getSchedules()]);
    await safeSyncRow('add', SHEETS.schedules, record);
    appendAudit({ audit_id: generateId('SAUD'), module: 'schedules', entity_type: 'schedule', entity_id: record.schedule_id, action: 'create_schedule_version', actor_id: getActorId(user), actor_name: getActorName(user), timestamp: nowIso(), details: JSON.stringify({ tournamentId: record.tournament_id, version: version_number, matches: input.matches.length }) });
    return record;
  },
  async submitForApproval(scheduleId: string, user: AuthUser) {
    const updated = this.getSchedules().map((item) => item.schedule_id === scheduleId
      ? {
        ...item,
        status: 'pending_approval',
        rejection_reason: '',
        assignee_id: '',
        due_at: item.due_at || new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        priority: item.priority || 'high',
        escalation_state: item.escalation_state || 'normal',
      }
      : item);
    write(STORAGE.schedules, updated);
    const changed = updated.find((item) => item.schedule_id === scheduleId);
    if (changed) await safeSyncRow('update', SHEETS.schedules, changed);
    appendAudit({ audit_id: generateId('SAUD'), module: 'schedules', entity_type: 'schedule', entity_id: scheduleId, action: 'submit_schedule_for_approval', actor_id: getActorId(user), actor_name: getActorName(user), timestamp: nowIso(), details: JSON.stringify({ status: 'pending_approval' }) });
  },
  async approveSchedule(scheduleId: string, comments: string, user: AuthUser) {
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
      timestamp: nowIso(),
    };
    const storedApprovals = dedupeByKey([approval, ...this.getApprovals()], (item) => item.approval_id || `${item.schedule_id}:${item.approver_id}:${item.approver_role}`);
    write(STORAGE.approvals, storedApprovals);
    await safeSyncRow('add', SHEETS.approvals, approval);

    const approvals = storedApprovals.filter((item) => item.schedule_id === scheduleId && item.decision === 'approved');
    const approvedRoles = new Set(approvals.map((item) => item.approver_role));
    const fullyApproved = scheduleApproverRoles.every((role) => approvedRoles.has(role));

    const updatedSchedules = this.getSchedules().map((item) => item.schedule_id === scheduleId ? { ...item, status: fullyApproved ? 'approved' : item.status } : item);
    write(STORAGE.schedules, updatedSchedules);
    const changed = updatedSchedules.find((item) => item.schedule_id === scheduleId);
    if (changed) await safeSyncRow('update', SHEETS.schedules, changed);
    appendAudit({ audit_id: generateId('SAUD'), module: 'schedules', entity_type: 'approval', entity_id: approval.approval_id, action: 'approve_schedule', actor_id: getActorId(user), actor_name: getActorName(user), timestamp: nowIso(), details: JSON.stringify({ scheduleId, approverRole: approval.approver_role, fullyApproved }) });
    return approval;
  },
  async rejectSchedule(scheduleId: string, comments: string, user: AuthUser) {
    if (!canApproveSchedule(user) || !isScheduleApproverRole(user.designation)) throw new Error('Only authorized office bearers can reject schedules.');
    const approval: ScheduleApprovalRecord = {
      approval_id: generateId('APR'),
      schedule_id: scheduleId,
      approver_id: getActorId(user),
      approver_name: getActorName(user),
      approver_role: user.designation || 'Management',
      decision: 'rejected',
      comments,
      timestamp: nowIso(),
    };
    write(STORAGE.approvals, dedupeByKey([approval, ...this.getApprovals()], (item) => item.approval_id || `${item.schedule_id}:${item.approver_id}:${item.approver_role}`));
    await safeSyncRow('add', SHEETS.approvals, approval);
    const updatedSchedules = this.getSchedules().map((item) => item.schedule_id === scheduleId ? { ...item, status: 'draft', rejection_reason: comments } : item);
    write(STORAGE.schedules, updatedSchedules);
    const changed = updatedSchedules.find((item) => item.schedule_id === scheduleId);
    if (changed) await safeSyncRow('update', SHEETS.schedules, changed);
    appendAudit({ audit_id: generateId('SAUD'), module: 'schedules', entity_type: 'approval', entity_id: approval.approval_id, action: 'reject_schedule', actor_id: getActorId(user), actor_name: getActorName(user), timestamp: nowIso(), details: JSON.stringify({ scheduleId, comments }) });
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
    const detailedStatus = getScheduleDetailedStatus(schedule, this.getApprovals());
    const matches = JSON.parse(schedule.matches_json) as ScheduleMatch[];
    const lines = [
      `Tournament: ${schedule.tournament_name}`,
      `Version: ${schedule.version_number}`,
      `Status: ${detailedStatus}`,
      `Issued in IST: ${formatInIST(schedule.timestamp)}`,
      `Hash: ${schedule.hash}`,
      `Approved by: ${approvals.map((item) => `${item.approver_name} (${item.approver_role})`).join(', ') || detailedStatus}`,
      'Matches:',
      ...matches.slice(0, 25).map((match) => `${formatScheduleSlotInIST(match.date, match.time)} ${match.team_a} vs ${match.team_b} @ ${match.venue}`),
    ];
    const securityLines = [
      'SECURE DIGITAL SCHEDULE',
      `Verification hash: ${schedule.hash}`,
      `Protected approval trail: ${approvals.length} recorded sign-off(s)`,
      `Generated for member viewing on ${formatInIST(nowIso())}`,
      'Handle as club-controlled digital record only.',
      ...lines,
    ];
    const content = buildSimplePdf(securityLines);
    const blob = new Blob([content], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${schedule.tournament_name.replace(/\s+/g, '-').toLowerCase()}-v${schedule.version_number}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  },
};

import { v2api } from './v2api';
import { sendSlaBreachAlertEmail, sendSupportUpdateEmail, sendTaskAssignmentEmail } from './mailer';
import { ManagementUser, SupportTicket } from './v2types';
import { Player } from './types';

interface NotifySupportUpdateParams {
  ticket: SupportTicket;
  actorName: string;
  actorDesignation?: string;
  updateType: 'reply' | 'status' | 'assignment';
  detail?: string;
  players: Player[];
}

export async function notifyTicketOwner(params: NotifySupportUpdateParams) {
  const [links, prefs] = await Promise.all([v2api.getEmailLinks(), v2api.getNotificationPrefs()]);
  const ownerId = params.ticket.created_by_user_id;
  const emailLink = links.find((l) => l.user_id === ownerId && l.is_verified && l.email);
  if (!emailLink?.email) return { sent: false, reason: 'no_verified_email' as const };

  const pref = prefs.find((p) => p.user_id === ownerId);
  if (pref && !pref.support_updates) return { sent: false, reason: 'opted_out' as const };

  const userName = params.players.find((p) => p.player_id === ownerId)?.name || 'Player';
  const result = await sendSupportUpdateEmail({
    to: emailLink.email,
    userName,
    ticketId: params.ticket.ticket_id,
    subjectLine: params.ticket.subject,
    status: params.ticket.status,
    updateType: params.updateType,
    actorName: params.actorName,
    actorDesignation: params.actorDesignation,
    detail: params.detail,
  });

  return { sent: result.success, reason: result.reason };
}

export function resolveSupportActor(actorId: string, managementUsers: ManagementUser[]) {
  if (actorId === 'admin') return { name: 'Support Admin', designation: 'Portal Administrator' };
  const mgmt = managementUsers.find((m) => m.management_id === actorId || m.username === actorId);
  if (mgmt) return { name: mgmt.name, designation: mgmt.designation };
  return { name: actorId, designation: '' };
}

export async function notifyWorkAssignment(params: {
  assigneeId: string;
  assignedBy: string;
  managementUsers: ManagementUser[];
  ticket: SupportTicket;
}) {
  if (!params.assigneeId) return { sent: false, reason: 'no_assignee' as const };
  const assignee = params.managementUsers.find((m) => m.management_id === params.assigneeId || m.username === params.assigneeId);
  if (!assignee?.email) return { sent: false, reason: 'no_email' as const };
  const result = await sendTaskAssignmentEmail({
    to: assignee.email,
    assigneeName: assignee.name,
    taskType: 'support_ticket',
    taskId: params.ticket.ticket_id,
    taskTitle: params.ticket.subject,
    assignedBy: params.assignedBy,
    dueAt: params.ticket.due_at || params.ticket.resolution_due,
    priority: params.ticket.priority,
  });
  return { sent: result.success, reason: result.reason };
}

export async function notifySupportSlaBreach(params: {
  ticket: SupportTicket;
  managementUsers: ManagementUser[];
}) {
  const assigneeId = params.ticket.assignee_id || params.ticket.assigned_admin_id;
  if (!assigneeId) return { sent: false, reason: 'no_assignee' as const };
  const assignee = params.managementUsers.find((m) => m.management_id === assigneeId || m.username === assigneeId);
  if (!assignee?.email) return { sent: false, reason: 'no_email' as const };
  const result = await sendSlaBreachAlertEmail({
    to: assignee.email,
    recipientLabel: assignee.name,
    taskType: 'support_ticket',
    taskId: params.ticket.ticket_id,
    title: params.ticket.subject,
    dueAt: params.ticket.due_at || params.ticket.resolution_due,
    escalatedAt: new Date().toISOString(),
  });
  return { sent: result.success, reason: result.reason };
}

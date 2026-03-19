import { v2api } from './v2api';
import { sendSupportUpdateEmail } from './mailer';
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

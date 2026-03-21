import { getAppsScriptUrl } from './googleSheets';
import { formatInIST } from './time';

export const DEFAULT_FROM_EMAIL = 'impdocs1308@gmail.com';
const ADMIN_MAILBOX_KEY = 'adminMailboxEmail';
const ADMIN_MAILBOX_VERIFIED_KEY = 'adminMailboxVerified';
const ADMIN_MAILBOX_ENABLED_KEY = 'adminMailboxEnabled';

interface SendMailPayload {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
}

interface MailResult {
  success: boolean;
  reason?: string;
  raw?: unknown;
}

export interface MailDeliveryAttempt {
  to: string;
  success: boolean;
  reason?: string;
  raw?: unknown;
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function getAdminMailboxEmail() {
  if (!canUseStorage()) return '';
  return String(localStorage.getItem(ADMIN_MAILBOX_KEY) || '').trim().toLowerCase();
}

export function isAdminMailboxVerified() {
  if (!canUseStorage()) return false;
  return localStorage.getItem(ADMIN_MAILBOX_VERIFIED_KEY) === 'true';
}

export function isAdminMailboxEnabled() {
  if (!canUseStorage()) return false;
  return localStorage.getItem(ADMIN_MAILBOX_ENABLED_KEY) !== 'false';
}

export function setAdminMailboxStatus(email: string, verified: boolean) {
  if (!canUseStorage()) return;
  localStorage.setItem(ADMIN_MAILBOX_KEY, String(email || '').trim().toLowerCase());
  localStorage.setItem(ADMIN_MAILBOX_VERIFIED_KEY, verified ? 'true' : 'false');
}

export function setAdminMailboxEnabled(enabled: boolean) {
  if (!canUseStorage()) return;
  localStorage.setItem(ADMIN_MAILBOX_ENABLED_KEY, enabled ? 'true' : 'false');
}

export function getEffectiveSenderEmail() {
  const adminEmail = getAdminMailboxEmail();
  if (adminEmail && isAdminMailboxVerified()) return adminEmail;
  return DEFAULT_FROM_EMAIL;
}

export function getAdminNotificationRecipient() {
  const adminEmail = getAdminMailboxEmail();
  if (!adminEmail || !isAdminMailboxVerified() || !isAdminMailboxEnabled()) return null;
  return adminEmail;
}

export function explainMailFailure(reason?: string, raw?: unknown) {
  const rawError = (raw && typeof raw === 'object' && 'error' in raw) ? String((raw as Record<string, unknown>).error || '') : '';
  if (reason === 'missing_config_or_recipient') return 'Mail service is not configured. Connect Google Apps Script URL and ensure recipient email is present.';
  if (reason === 'network_failure') return 'Network error while calling mail service.';
  if (reason === 'invalid_json_response') return 'Mail service returned an invalid response. Please redeploy Apps Script and try again.';
  if (rawError) return `Mail service error: ${rawError}`;
  return 'Unable to send email. Check Apps Script deployment and Gmail permissions.';
}

function cardLayout(content: string) {
  const effectiveSender = getEffectiveSenderEmail();
  return `<!doctype html>
  <html>
    <body style="margin:0;padding:0;background:#f3f5f8;font-family:Inter,Segoe UI,Arial,sans-serif;color:#1f2937;">
      <div style="max-width:680px;margin:24px auto;padding:0 16px;">
        <div style="background:linear-gradient(135deg,#0f172a,#111827,#1f2937);border-radius:16px 16px 0 0;padding:28px 24px;color:#fff;">
          <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.82;">Cricket Club Portal</p>
          <h1 style="margin:8px 0 0;font-size:24px;font-weight:700;">Luxury Communication Desk</h1>
        </div>
        <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:24px;">
          ${content}
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
          <p style="margin:0;font-size:12px;color:#6b7280;">Delivered by Cricket Club Portal · Luxury Member Communications</p>
          <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">From/Reply: ${effectiveSender}</p>
        </div>
      </div>
    </body>
  </html>`;
}

export async function sendSystemEmail(payload: SendMailPayload): Promise<MailResult> {
  const url = getAppsScriptUrl();
  const recipient = String(payload.to || '').trim();
  if (!url || !recipient) return { success: false, reason: 'missing_config_or_recipient' };
  const configuredSender = getEffectiveSenderEmail();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'sendMail',
        data: {
          to: recipient,
          subject: payload.subject,
          htmlBody: payload.htmlBody,
          textBody: payload.textBody || '',
          fromEmail: payload.fromEmail || configuredSender,
          fromName: payload.fromName || 'Cricket Club Portal',
          replyTo: payload.replyTo || configuredSender,
        },
      }),
    });
    const text = await res.text();
    let result: Record<string, unknown> = {};
    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      return { success: false, reason: 'invalid_json_response', raw: text };
    }
    if (!result.success) return { success: false, reason: 'mail_service_error', raw: result };
    return { success: true, raw: result };
  } catch {
    return { success: false, reason: 'network_failure' };
  }
}

export async function sendScorelistApprovalRequestBulk(params: {
  recipients: Array<{ to: string; approverName: string }>;
  scorelistId: string;
  stageLabel: string;
  actorName?: string;
}): Promise<MailDeliveryAttempt[]> {
  const attempts = await Promise.all(
    params.recipients.map(async (recipient): Promise<MailDeliveryAttempt> => {
      const result = await sendScorelistApprovalRequestEmail({
        to: recipient.to,
        approverName: recipient.approverName,
        scorelistId: params.scorelistId,
        stageLabel: params.stageLabel,
        actorName: params.actorName,
      });
      return { to: recipient.to, success: result.success, reason: result.reason, raw: result.raw };
    }),
  );
  return attempts;
}

export async function sendOtpEmail(params: { to: string; userName?: string; otp: string; expiresAt: string }) {
  const htmlBody = cardLayout(`
    <p style="margin:0 0 8px;font-size:16px;">Hello ${params.userName || 'Player'},</p>
    <p style="margin:0 0 16px;line-height:1.6;color:#374151;">Use the OTP below to verify your email account. This helps us deliver support updates, scorelist notifications, and security alerts.</p>
    <div style="text-align:center;margin:20px 0;">
      <span style="display:inline-block;padding:14px 24px;background:#111827;color:#fff;border-radius:12px;font-size:30px;letter-spacing:8px;font-weight:700;">${params.otp}</span>
    </div>
    <p style="margin:0;color:#6b7280;font-size:13px;">Valid until: ${formatInIST(params.expiresAt)}</p>
    <p style="margin:10px 0 0;color:#dc2626;font-size:13px;">If you did not request this, please ignore this email.</p>
  `);
  return sendSystemEmail({ to: params.to, subject: 'Your Cricket Club verification OTP', htmlBody, fromName: 'Cricket Club Security' });
}

export async function sendWelcomeSubscriptionEmail(params: { to: string; userName?: string; actions: string[] }) {
  const actionsHtml = params.actions.map((a) => `<li style="margin:6px 0;">${a}</li>`).join('');
  const htmlBody = cardLayout(`
    <p style="margin:0 0 8px;font-size:16px;">Congratulations ${params.userName || 'User'} 🎉</p>
    <p style="margin:0 0 16px;line-height:1.6;color:#374151;">You have been successfully enrolled for our luxury portal communications.</p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
      <p style="margin:0 0 10px;font-weight:600;">Active communication channels:</p>
      <ul style="margin:0 0 0 18px;padding:0;line-height:1.5;">${actionsHtml}</ul>
    </div>
    <p style="margin:16px 0 0;line-height:1.6;color:#374151;">You can update notification preferences any time from your dashboard.</p>
  `);
  return sendSystemEmail({ to: params.to, subject: 'Welcome! Your communication preferences are now active', htmlBody });
}

export async function sendScorelistApprovalRequestEmail(params: {
  to: string;
  approverName: string;
  scorelistId: string;
  stageLabel: string;
  actorName?: string;
}) {
  const htmlBody = cardLayout(`
    <p style="margin:0 0 8px;font-size:16px;">Dear ${params.approverName},</p>
    <p style="margin:0 0 16px;line-height:1.6;color:#374151;">A scorelist is awaiting your approval action.</p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:14px;">
      <p style="margin:0 0 6px;"><strong>Scorelist ID:</strong> <span style="font-family:monospace">${params.scorelistId}</span></p>
      <p style="margin:0 0 6px;"><strong>Required Stage:</strong> ${params.stageLabel}</p>
      <p style="margin:0;"><strong>Triggered By:</strong> ${params.actorName || 'System'}</p>
    </div>
    <p style="margin:16px 0 0;color:#374151;">Please log in to the management dashboard to review and sign.</p>
  `);
  return sendSystemEmail({ to: params.to, subject: `Approval Required: ${params.scorelistId}`, htmlBody, fromName: 'Cricket Club Approvals' });
}

export async function sendSupportUpdateEmail(params: {
  to: string;
  userName?: string;
  ticketId: string;
  subjectLine: string;
  status: string;
  updateType: 'reply' | 'status' | 'assignment';
  actorName: string;
  actorDesignation?: string;
  detail?: string;
}) {
  const chipColor = params.updateType === 'status' ? '#1d4ed8' : params.updateType === 'assignment' ? '#7c3aed' : '#0f766e';
  const htmlBody = cardLayout(`
    <p style="margin:0 0 8px;font-size:16px;">Hello ${params.userName || 'Player'},</p>
    <p style="margin:0 0 16px;line-height:1.6;color:#374151;">Your support request has been updated by our premium support desk.</p>
    <div style="background:linear-gradient(135deg,#f8fafc,#eef2ff);border:1px solid #dbeafe;border-radius:14px;padding:16px;">
      <p style="margin:0 0 8px;"><strong>Ticket ID:</strong> <span style="font-family:monospace">${params.ticketId}</span></p>
      <p style="margin:0 0 8px;"><strong>Subject:</strong> ${params.subjectLine}</p>
      <p style="margin:0 0 8px;"><strong>Status:</strong> <span style="padding:2px 10px;border-radius:999px;background:${chipColor};color:#fff;font-size:12px;">${params.status.replace('_', ' ')}</span></p>
      <p style="margin:0;"><strong>Updated by:</strong> ${params.actorName}${params.actorDesignation ? ` · ${params.actorDesignation}` : ''}</p>
    </div>
    ${params.detail ? `<p style="margin:16px 0 0;line-height:1.6;color:#374151;"><strong>Latest note:</strong> ${params.detail}</p>` : ''}
    <p style="margin:16px 0 0;line-height:1.6;color:#374151;">Please log in to your player dashboard to review.</p>
  `);
  return sendSystemEmail({ to: params.to, subject: `Support Case Update • ${params.ticketId}`, htmlBody, fromName: 'Cricket Club Concierge Support' });
}

/** Send email when management/admin sends a message or notice to a player */
export async function sendMessageNotificationEmail(params: {
  to: string;
  playerName: string;
  senderName: string;
  senderDesignation?: string;
  subject: string;
  bodyPreview: string;
}) {
  const htmlBody = cardLayout(`
    <p style="margin:0 0 8px;font-size:16px;">Hello ${params.playerName},</p>
    <p style="margin:0 0 16px;line-height:1.6;color:#374151;">A premium communication has arrived from the Cricket Club administration.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:16px;">
      <p style="margin:0 0 8px;"><strong>From:</strong> ${params.senderName}${params.senderDesignation ? ` (${params.senderDesignation})` : ''}</p>
      <p style="margin:0 0 8px;"><strong>Subject:</strong> ${params.subject}</p>
      <p style="margin:0;color:#374151;font-style:italic;">"${params.bodyPreview.slice(0, 300)}${params.bodyPreview.length > 300 ? '...' : ''}"</p>
    </div>
    <p style="margin:16px 0 0;color:#374151;">Log in to your player dashboard to view the full message and reply.</p>
  `);
  return sendSystemEmail({ to: params.to, subject: `New Message: ${params.subject}`, htmlBody, fromName: 'Cricket Club Messages' });
}

/** Send approval thank you email */
export async function sendApprovalThankYouEmail(params: {
  to: string;
  approverName: string;
  scorelistId: string;
  stage: string;
  nextStage?: string;
}) {
  const htmlBody = cardLayout(`
    <p style="margin:0 0 8px;font-size:16px;">Dear ${params.approverName},</p>
    <p style="margin:0 0 16px;line-height:1.6;color:#374151;">Thank you for signing and approving the digital scorelist.</p>
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:14px;padding:16px;">
      <p style="margin:0 0 6px;"><strong>Scorelist ID:</strong> <span style="font-family:monospace">${params.scorelistId}</span></p>
      <p style="margin:0 0 6px;"><strong>Your Stage:</strong> ${params.stage}</p>
      ${params.nextStage ? `<p style="margin:0;"><strong>Next Approval:</strong> ${params.nextStage}</p>` : '<p style="margin:0;color:#059669;font-weight:600;">✅ This scorelist is now OFFICIALLY CERTIFIED</p>'}
    </div>
    <p style="margin:16px 0 0;color:#374151;">Your signature has been recorded in the audit trail.</p>
  `);
  return sendSystemEmail({ to: params.to, subject: `Thank you for signing: ${params.scorelistId}`, htmlBody, fromName: 'Cricket Club Certifications' });
}

/** Send scorelist status change email to admin */
export async function sendScorelistStatusEmailToAdmin(params: {
  to: string;
  scorelistId: string;
  stage: string;
  signedBy: string;
  designation: string;
  comment?: string;
}) {
  const htmlBody = cardLayout(`
    <p style="margin:0 0 8px;font-size:16px;">Admin Notification,</p>
    <p style="margin:0 0 16px;line-height:1.6;color:#374151;">A scorelist certification status has changed.</p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:16px;">
      <p style="margin:0 0 6px;"><strong>Scorelist:</strong> <span style="font-family:monospace">${params.scorelistId}</span></p>
      <p style="margin:0 0 6px;"><strong>New Stage:</strong> ${params.stage}</p>
      <p style="margin:0 0 6px;"><strong>Signed By:</strong> ${params.signedBy} (${params.designation})</p>
      ${params.comment ? `<p style="margin:0;"><strong>Comment:</strong> ${params.comment}</p>` : ''}
    </div>
  `);
  return sendSystemEmail({ to: params.to, subject: `Scorelist Update: ${params.scorelistId} → ${params.stage}`, htmlBody });
}

export async function sendScorelistReminderEmail(params: {
  to: string;
  approverName: string;
  scorelistId: string;
  stageLabel: string;
  pendingSince?: string;
}) {
  const htmlBody = cardLayout(`
    <p style="margin:0 0 8px;font-size:16px;">Hello ${params.approverName},</p>
    <p style="margin:0 0 16px;line-height:1.6;color:#374151;">This is a reminder that a scorelist is still waiting for your approval.</p>
    <div style="background:#fff7ed;border:1px solid #fdba74;border-radius:14px;padding:16px;">
      <p style="margin:0 0 6px;"><strong>Scorelist ID:</strong> <span style="font-family:monospace">${params.scorelistId}</span></p>
      <p style="margin:0 0 6px;"><strong>Pending Stage:</strong> ${params.stageLabel}</p>
      ${params.pendingSince ? `<p style="margin:0;"><strong>Pending Since:</strong> ${params.pendingSince}</p>` : ''}
    </div>
    <p style="margin:16px 0 0;color:#374151;">Please visit the management board to review, sign, or comment on the scorelist.</p>
  `);
  return sendSystemEmail({ to: params.to, subject: `Reminder: scorelist pending your approval • ${params.scorelistId}`, htmlBody, fromName: 'Cricket Club Approvals' });
}

export async function sendSupportTicketCreatedEmail(params: {
  to: string;
  userName?: string;
  ticketId: string;
  subjectLine: string;
  priority: string;
  category: string;
}) {
  const htmlBody = cardLayout(`
    <p style="margin:0 0 8px;font-size:16px;">Hello ${params.userName || 'Player'},</p>
    <p style="margin:0 0 16px;line-height:1.6;color:#374151;">Your support ticket has been created successfully. Our support and management teams will keep you updated at every important stage.</p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:16px;">
      <p style="margin:0 0 6px;"><strong>Ticket ID:</strong> <span style="font-family:monospace">${params.ticketId}</span></p>
      <p style="margin:0 0 6px;"><strong>Subject:</strong> ${params.subjectLine}</p>
      <p style="margin:0 0 6px;"><strong>Category:</strong> ${params.category}</p>
      <p style="margin:0;"><strong>Priority:</strong> ${params.priority}</p>
    </div>
    <p style="margin:16px 0 0;color:#374151;">You can track progress and reply from your player dashboard.</p>
  `);
  return sendSystemEmail({ to: params.to, subject: `Support ticket created • ${params.ticketId}`, htmlBody, fromName: 'Cricket Club Concierge Support' });
}

export async function sendAdminCommunicationEmail(params: {
  to: string;
  title: string;
  summary: string;
  detailLines?: string[];
}) {
  const detailHtml = (params.detailLines || []).map((line) => `<li style="margin:6px 0;">${line}</li>`).join('');
  const htmlBody = cardLayout(`
    <p style="margin:0 0 8px;font-size:16px;">Admin Notification,</p>
    <p style="margin:0 0 16px;line-height:1.6;color:#374151;">${params.summary}</p>
    ${detailHtml ? `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:16px;"><ul style="margin:0 0 0 18px;padding:0;">${detailHtml}</ul></div>` : ''}
  `);
  return sendSystemEmail({ to: params.to, subject: params.title, htmlBody, fromName: 'Cricket Club Admin Alerts' });
}

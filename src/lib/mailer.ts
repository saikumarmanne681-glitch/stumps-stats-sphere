import { getAppsScriptUrl } from './googleSheets';

export const DEFAULT_FROM_EMAIL = 'mudirajskmr@gmail.com';
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
          <h1 style="margin:8px 0 0;font-size:24px;font-weight:700;">Premium Notification Center</h1>
        </div>
        <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:24px;">
          ${content}
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
          <p style="margin:0;font-size:12px;color:#6b7280;">Sent by Cricket Club Portal · Admin Desk</p>
          <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">From/Reply: ${effectiveSender}</p>
        </div>
      </div>
    </body>
  </html>`;
}

export async function sendSystemEmail(payload: SendMailPayload): Promise<MailResult> {
  const url = getAppsScriptUrl();
  if (!url || !payload.to.trim()) return { success: false, reason: 'missing_config_or_recipient' };
  const configuredSender = getEffectiveSenderEmail();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'sendMail',
        data: {
          to: payload.to,
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

export async function sendOtpEmail(params: { to: string; userName?: string; otp: string; expiresAt: string }) {
  const htmlBody = cardLayout(`
    <p style="margin:0 0 8px;font-size:16px;">Hello ${params.userName || 'Player'},</p>
    <p style="margin:0 0 16px;line-height:1.6;color:#374151;">Use the OTP below to verify your email account. This helps us deliver support updates, scorelist notifications, and security alerts.</p>
    <div style="text-align:center;margin:20px 0;">
      <span style="display:inline-block;padding:14px 24px;background:#111827;color:#fff;border-radius:12px;font-size:30px;letter-spacing:8px;font-weight:700;">${params.otp}</span>
    </div>
    <p style="margin:0;color:#6b7280;font-size:13px;">Valid until: ${new Date(params.expiresAt).toLocaleString()}</p>
    <p style="margin:10px 0 0;color:#dc2626;font-size:13px;">If you did not request this, please ignore this email.</p>
  `);
  return sendSystemEmail({
    to: params.to,
    subject: 'Your Cricket Club verification OTP',
    htmlBody,
    fromName: 'Cricket Club Security',
  });
}

export async function sendWelcomeSubscriptionEmail(params: { to: string; userName?: string; actions: string[] }) {
  const actionsHtml = params.actions.map((a) => `<li style="margin:6px 0;">${a}</li>`).join('');
  const htmlBody = cardLayout(`
    <p style="margin:0 0 8px;font-size:16px;">Congratulations ${params.userName || 'User'} 🎉</p>
    <p style="margin:0 0 16px;line-height:1.6;color:#374151;">You have been successfully subscribed for premium portal communications.</p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
      <p style="margin:0 0 10px;font-weight:600;">Active communication channels:</p>
      <ul style="margin:0 0 0 18px;padding:0;line-height:1.5;">${actionsHtml}</ul>
    </div>
    <p style="margin:16px 0 0;line-height:1.6;color:#374151;">You can update notification preferences any time from your dashboard.</p>
  `);
  return sendSystemEmail({
    to: params.to,
    subject: 'Welcome! Your communication preferences are now active',
    htmlBody,
  });
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
  return sendSystemEmail({
    to: params.to,
    subject: `Approval Required: ${params.scorelistId}`,
    htmlBody,
    fromName: 'Cricket Club Approvals',
  });
}

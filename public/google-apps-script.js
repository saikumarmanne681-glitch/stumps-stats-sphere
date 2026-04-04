/**
 * ============================================================
 *  CRICKET CLUB PORTAL — Google Apps Script (Web App API)
 * ============================================================
 *
 *  HOW TO SET UP:
 *  1. Go to https://script.google.com and create a new project
 *  2. Delete any existing code in Code.gs
 *  3. Paste this entire script into Code.gs
 *  4. Click Deploy → New deployment
 *  5. Choose "Web app" as type
 *  6. Set "Execute as" → Me
 *  7. Set "Who has access" → Anyone
 *  8. Click Deploy and copy the Web App URL
 *  9. Paste the URL into the Cricket Club Portal admin settings
 * 10. IMPORTANT: run `authorizeMailAccess` once from Apps Script editor
 *     and complete OAuth consent so mail scopes are granted.
 *
 *  The script will auto-create a Google Sheet named
 *  "CricketClubPortal" in your Google Drive with all required tabs.
 * ============================================================
 */

// ──────── CONFIG ────────
const SHEET_NAME = "CricketClubPortal-lovable";

const TABS = {
  Players: ["player_id", "name", "username", "password", "phone", "role", "status"],
  Tournaments: ["tournament_id", "name", "format", "overs", "description"],
  Seasons: ["season_id", "tournament_id", "year", "start_date", "end_date", "status", "winner_team", "runner_up_team"],
  Matches: [
    "match_id",
    "season_id",
    "tournament_id",
    "date",
    "team_a",
    "team_b",
    "venue",
    "status",
    "toss_winner",
    "toss_decision",
    "result",
    "man_of_match",
    "team_a_score",
    "team_b_score",
    "match_stage",
    "scorecard_version",
    "scorecard_checksum",
    "scorecard_operation_id",
  ],
  BattingScorecard: [
    "id",
    "match_id",
    "player_id",
    "team",
    "runs",
    "balls",
    "fours",
    "sixes",
    "strike_rate",
    "how_out",
    "bowler_id",
  ],
  BowlingScorecard: [
    "id",
    "match_id",
    "player_id",
    "team",
    "overs",
    "maidens",
    "runs_conceded",
    "wickets",
    "economy",
    "extras",
  ],
  Announcements: ["id", "title", "message", "date", "active", "created_by"],
  Messages: ["id", "from_id", "to_id", "subject", "body", "date", "read", "reply_to"],
  // v2.0 Modules
  SUPPORT_TICKETS: ["ticket_id","created_by_user_id","category","priority","subject","description","attachment_url","status","assigned_admin_id","created_at","first_response_due","resolution_due","resolved_at","closed_at"],
  SUPPORT_MESSAGES: ["message_id","ticket_id","sender_id","sender_role","message_body","attachment_url","is_internal_note","created_at"],
  SUPPORT_CSAT: ["csat_id","ticket_id","rating","feedback","submitted_at"],
  USER_EMAIL_LINKS: ["user_id","email","is_verified","verification_token","token_expiry","verified_at","created_at"],
  USER_NOTIFICATION_PREFERENCES: ["user_id","support_updates","announcements","security_alerts","updated_at"],
  USER_PRESENCE: ["user_id","last_heartbeat","last_seen","active_sessions","device_type"],
  DIGITAL_SCORELISTS: ["scorelist_id","season_id","tournament_id","match_id","scope_type","payload_json","hash_digest","signature","generated_by","generated_at","certification_status","certifications_json","locked"],
  AUDIT_EVENTS: ["event_id","actor_user","event_type","entity_type","entity_id","metadata","timestamp"],
  MANAGEMENT_USERS: ["management_id","name","email","phone","designation","role","authority_level","signature_image","status","created_at","username","password"],
  ADMIN_CREDENTIALS: ["admin_id","username","password","name","status","created_at","updated_at"],
  MATCH_TIMELINE: ["event_id","match_id","over","event_type","description","player_id","team","timestamp"],
  BOARD_CONFIGURATION: ["config_id","current_period","administration_team_ids","department_assignments_json","updated_at","updated_by"],
  NEWS_ROOM_POSTS: ["post_id","title","body","audience","status","posted_by_id","posted_by_name","posted_by_role","published_at","updated_at"],
  MAIL_DIAGNOSTICS: ["mail_log_id","triggered_at","triggered_by","trigger_source","trigger_entity_type","trigger_entity_id","recipient","subject","body_html","body_text","from_email","reply_to","mail_provider","status","failure_reason","raw_response"],
  CERTIFICATES: ["id","type","tournament","season","match_id","recipient_type","recipient_id","recipient_name","linked_player_id","linked_team_name","template_id","status","created_by","created_at","details_json","performance_json","verification_code","certified_at","certified_by","approval_status","approvals_json","signatures_json","certificate_html","verification_url","verification_token","security_hash","tamper_evident_payload","delivery_status","render_provider","render_status","render_error","rendered_at","canva_template_id","canva_job_id","canva_export_url"],
  CERTIFICATE_APPROVALS: ["certificate_id","role","status","approved_by","approved_at","remarks"],
  CERTIFICATE_TEMPLATES: ["template_id","type","template_name","image_url","design_config"],
  CANVA_CERTIFICATE_JOBS: ["job_id","certificate_id","template_id","recipient_name","payload_json","status","export_url","error","requested_by","requested_at","completed_at"],
  OFFICIAL_DOCUMENTS: ["document_id","title","category","department","source_url","source_type","status","allowed_management_ids","allow_preview","allow_download","created_by","created_at","updated_at"],
  TEAM_PROFILES: ["team_id","team_name","short_name","captain_name","coach_name","home_ground","founded_year","primary_color","secondary_color","status","created_at","updated_at"],
  TEAM_TITLES: ["title_id","team_id","team_name","competition_name","tournament_id","season_id","season_label","result_type","won_on","notes","created_at"],
  TEAM_ACCESS_USERS: ["team_access_id","team_id","team_name","username","password","status","created_at","updated_at","linked_by_admin"],
  FORM_DEFINITIONS: ["form_id","title","slug","description","status","audience","schema_json","settings_json","created_by","updated_by","created_at","updated_at","published_at"],
  FORM_ENTRIES: ["entry_id","form_id","form_title","submitted_by_id","submitted_by_name","submitted_by_role","payload_json","status","notes","submitted_at","reviewed_at","reviewed_by"],
  // Governance & competition workflow modules
  tournaments_v2: ["tournament_id","name","format","venue","start_date","end_date","registration_deadline","created_by","created_at","status","notes","season_id","season_year","source_type","public_page_path"],
  schedules: ["schedule_id","tournament_id","tournament_name","version_number","matches_json","created_by","created_by_name","timestamp","change_log","status","parent_schedule_id","hash","rejection_reason"],
  approvals: ["approval_id","schedule_id","approver_id","approver_name","approver_role","decision","comments","timestamp"],
};

// ──────── HELPERS ────────
function getOrCreateSpreadsheet() {
  const files = DriveApp.getFilesByName(SHEET_NAME);
  if (files.hasNext()) return SpreadsheetApp.open(files.next());
  return SpreadsheetApp.create(SHEET_NAME);
}

function getOrCreateSheet(ss, tabName) {
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
    sheet.appendRow(TABS[tabName]);
    // Bold + freeze header
    sheet.getRange(1, 1, 1, TABS[tabName].length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function sheetToJson(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i];
    });
    return obj;
  });
}

function normalizeKeyValue(value) {
  return String(value === null || value === undefined ? "" : value).trim();
}

function findRowIndex(sheet, keyCol, keyVal) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colIdx = headers.indexOf(keyCol);
  if (colIdx === -1) return -1;
  const target = normalizeKeyValue(keyVal);
  if (!target) return -1;
  for (let i = 1; i < data.length; i++) {
    if (normalizeKeyValue(data[i][colIdx]) === target) return i + 1; // 1-indexed
  }
  return -1;
}

function findCertificateRowIndex(sheet, payload) {
  const data = sheet.getDataRange().getValues();
  if (!data || data.length <= 1) return -1;
  const headers = data[0] || [];
  const idIdx = headers.indexOf("id");
  const certificateIdIdx = headers.indexOf("certificate_id");
  const incomingId = normalizeKeyValue((payload && (payload.id || payload.certificate_id)) || "");
  if (!incomingId) return -1;

  for (let i = 1; i < data.length; i++) {
    const rowId = idIdx !== -1 ? normalizeKeyValue(data[i][idIdx] || "") : "";
    const legacyId = certificateIdIdx !== -1 ? normalizeKeyValue(data[i][certificateIdIdx] || "") : "";
    if (rowId === incomingId || legacyId === incomingId) return i + 1; // 1-indexed
  }
  return -1;
}

function getKeyColumn(tabName) {
  const map = {
    Players: "player_id",
    Tournaments: "tournament_id",
    Seasons: "season_id",
    Matches: "match_id",
    BattingScorecard: "id",
    BowlingScorecard: "id",
    Announcements: "id",
    Messages: "id",
    // v2.0
    SUPPORT_TICKETS: "ticket_id",
    SUPPORT_MESSAGES: "message_id",
    SUPPORT_CSAT: "csat_id",
    USER_EMAIL_LINKS: "user_id",
    USER_NOTIFICATION_PREFERENCES: "user_id",
    USER_PRESENCE: "user_id",
    DIGITAL_SCORELISTS: "scorelist_id",
    AUDIT_EVENTS: "event_id",
    MANAGEMENT_USERS: "management_id",
    ADMIN_CREDENTIALS: "admin_id",
    MATCH_TIMELINE: "event_id",
    BOARD_CONFIGURATION: "config_id",
    NEWS_ROOM_POSTS: "post_id",
    MAIL_DIAGNOSTICS: "mail_log_id",
    CERTIFICATES: "id",
    CERTIFICATE_APPROVALS: "certificate_id",
    CERTIFICATE_TEMPLATES: "template_id",
    CANVA_CERTIFICATE_JOBS: "job_id",
    OFFICIAL_DOCUMENTS: "document_id",
    TEAM_PROFILES: "team_id",
    TEAM_TITLES: "title_id",
    TEAM_ACCESS_USERS: "team_access_id",
    FORM_DEFINITIONS: "form_id",
    FORM_ENTRIES: "entry_id",
    tournaments_v2: "tournament_id",
    schedules: "schedule_id",
    approvals: "approval_id",
  };
  return map[tabName] || "id";
}


function ensureSheetSchema(sheet, headers) {
  const existingHeaders = (sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0] || []).map((h) => String(h || '').trim());
  const missing = headers.filter((h) => !existingHeaders.includes(h));
  if (missing.length === 0) return { added: [] };

  const startCol = Math.max(existingHeaders.filter(Boolean).length, 0) + 1;
  sheet.getRange(1, startCol, 1, missing.length).setValues([missing]);
  sheet.getRange(1, 1, 1, startCol + missing.length - 1).setFontWeight("bold");
  sheet.setFrozenRows(1);
  return { added: missing };
}

function ensureAllTabsAndHeaders(ss) {
  const report = {};
  Object.keys(TABS).forEach((tabName) => {
    const sheet = getOrCreateSheet(ss, tabName);
    report[tabName] = ensureSheetSchema(sheet, TABS[tabName]);
  });
  return report;
}

function cleanupSheetColumns(sheet, expectedHeaders) {
  const maxColumns = sheet.getMaxColumns();
  const expectedCount = expectedHeaders.length;
  if (maxColumns <= expectedCount) return { deleted: 0 };

  const extraColumns = maxColumns - expectedCount;
  const trailingValues = sheet.getRange(1, expectedCount + 1, sheet.getMaxRows(), extraColumns).getValues();
  const hasDataInExtras = trailingValues.some((row) => row.some((value) => String(value || "").trim() !== ""));
  if (hasDataInExtras) return { deleted: 0, skipped: "extra_columns_contain_data" };

  sheet.deleteColumns(expectedCount + 1, extraColumns);
  return { deleted: extraColumns };
}

function cleanupSpreadsheetStructure(ss, options) {
  const settings = options || {};
  const dryRun = settings.dryRun !== false;
  const removeUnknownSheets = settings.removeUnknownSheets !== false;
  const trimTrailingColumns = settings.trimTrailingColumns !== false;
  const report = {
    dry_run: dryRun,
    unknown_sheets_removed: [],
    unknown_sheets_skipped: [],
    trailing_columns_trimmed: {},
  };

  if (removeUnknownSheets) {
    const knownTabs = Object.keys(TABS);
    const knownSet = {};
    knownTabs.forEach((tab) => {
      knownSet[tab] = true;
    });

    ss.getSheets().forEach((sheet) => {
      const name = sheet.getName();
      if (knownSet[name]) return;

      const hasRows = sheet.getLastRow() > 1;
      const hasCols = sheet.getLastColumn() > 1;
      const hasContent = hasRows || hasCols;
      if (hasContent) {
        report.unknown_sheets_skipped.push(name);
        return;
      }

      report.unknown_sheets_removed.push(name);
      if (!dryRun) ss.deleteSheet(sheet);
    });
  }

  if (trimTrailingColumns) {
    Object.keys(TABS).forEach((tabName) => {
      const sheet = getOrCreateSheet(ss, tabName);
      ensureSheetSchema(sheet, TABS[tabName]);
      const result = cleanupSheetColumns(sheet, TABS[tabName]);
      report.trailing_columns_trimmed[tabName] = result;
    });
  }

  return report;
}

function toSafeNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function scorecardPayloadChecksum(payload) {
  const serialized = JSON.stringify(payload);
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, serialized, Utilities.Charset.UTF_8);
  return digest.map((b) => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

function validateScorecardRows(matchId, battingEntries, bowlingEntries) {
  if (!Array.isArray(battingEntries) || !Array.isArray(bowlingEntries)) return "Invalid batting/bowling payload arrays.";
  const hasInvalidBatting = battingEntries.some((row) => !row || String(row.match_id || '') !== String(matchId) || !row.id || !row.player_id);
  if (hasInvalidBatting) return "Batting payload includes invalid rows (id/player/match mismatch).";
  const hasInvalidBowling = bowlingEntries.some((row) => !row || String(row.match_id || '') !== String(matchId) || !row.id || !row.player_id);
  if (hasInvalidBowling) return "Bowling payload includes invalid rows (id/player/match mismatch).";
  return "";
}

function sendOtpEmail(email, otp) {
  const subject = "Your Cricket Club OTP";
  const body = "Your verification code is: " + otp + "\n\nThis code expires in 10 minutes.";
  MailApp.sendEmail(email, subject, body);
}

function appendMailDiagnostic(ss, payload) {
  const sheet = getOrCreateSheet(ss, "MAIL_DIAGNOSTICS");
  ensureSheetSchema(sheet, TABS.MAIL_DIAGNOSTICS);
  const headers = TABS.MAIL_DIAGNOSTICS;
  const row = headers.map((h) => {
    const value = payload && payload[h] !== undefined ? payload[h] : "";
    if (value === null || value === undefined) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return value;
  });
  sheet.appendRow(row);
}

function getScriptProperty(key, fallback) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (value === null || value === undefined || value === "") return fallback;
  return value;
}

function upsertByKey(sheet, keyCol, payload, headers) {
  const keyValue = payload[keyCol];
  const row = headers.map((h) => payload[h] !== undefined && payload[h] !== null ? payload[h] : "");
  const rowIndex = findRowIndex(sheet, keyCol, keyValue);
  if (rowIndex === -1) {
    sheet.appendRow(row);
    return "insert";
  }
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([row]);
  return "update";
}

function canvaAuthorizeUrl() {
  const clientId = getScriptProperty("CANVA_CLIENT_ID", "");
  const redirectUri = getScriptProperty("CANVA_REDIRECT_URI", "");
  if (!clientId || !redirectUri) return "";
  const scope = encodeURIComponent("design:content:read design:content:write asset:read");
  return `https://www.canva.com/api/oauth/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;
}

// ──────── CORS ────────
function setCorsHeaders(output) {
  // ContentService handles CORS for web apps automatically
  return output;
}

function authorizeMailAccess() {
  // Run manually once after deployment or scope changes.
  GmailApp.getAliases();
  return "Mail authorization completed";
}

// ──────── GET ────────
function doGet(e) {
  const action = e.parameter.action || "get";
  const ss = getOrCreateSpreadsheet();

  if (action === "get") {
    const tabName = e.parameter.sheet;
    if (!tabName || !TABS[tabName]) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Invalid sheet name" })).setMimeType(
        ContentService.MimeType.JSON,
      );
    }
    const sheet = getOrCreateSheet(ss, tabName);
    ensureSheetSchema(sheet, TABS[tabName]);
    const data = sheetToJson(sheet);
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "seed") {
    // Create all tabs with headers
    Object.keys(TABS).forEach((tabName) => getOrCreateSheet(ss, tabName));
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "All tabs created" })).setMimeType(
      ContentService.MimeType.JSON,
    );
  }

  if (action === "syncHeaders") {
    const report = ensureAllTabsAndHeaders(ss);
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Headers synced", report })).setMimeType(
      ContentService.MimeType.JSON,
    );
  }

  if (action === "cleanupSchema") {
    const dryRun = String(e.parameter.dryRun || "true").toLowerCase() !== "false";
    const report = cleanupSpreadsheetStructure(ss, { dryRun });
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: dryRun ? "Cleanup dry-run completed" : "Cleanup completed",
      report,
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "canvaAuthStart") {
    const authUrl = canvaAuthorizeUrl();
    if (!authUrl) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Missing CANVA_CLIENT_ID or CANVA_REDIRECT_URI in Script Properties.",
      })).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, auth_url: authUrl })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "canvaAuthCallback") {
    const code = String(e.parameter.code || "").trim();
    if (!code) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Missing OAuth code." })).setMimeType(ContentService.MimeType.JSON);
    }
    PropertiesService.getScriptProperties().setProperty("CANVA_AUTH_CODE", code);
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "OAuth callback received. Exchange this code for tokens in secure server-side flow.",
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "seedWithData") {
    // Create tabs and insert mock data (sent as POST usually, but support GET too)
    Object.keys(TABS).forEach((tabName) => getOrCreateSheet(ss, tabName));
    return ContentService.createTextOutput(
      JSON.stringify({ success: true, message: "Tabs created. Send POST with mock data to populate." }),
    ).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ error: "Unknown action" })).setMimeType(
    ContentService.MimeType.JSON,
  );
}

// ──────── POST ────────
function doPost(e) {
  const ss = getOrCreateSpreadsheet();
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Invalid JSON" })).setMimeType(
      ContentService.MimeType.JSON,
    );
  }

  const { action, sheet: tabName, data } = body;

  if (action === "sendMail") {
    const diagnostics = (data && data.diagnostics) || {};
    const baseDiagnostic = {
      mail_log_id: `MAIL_${new Date().getTime()}_${Math.random().toString(36).substring(2, 7)}`,
      triggered_at: new Date().toISOString(),
      triggered_by: String(diagnostics.triggeredBy || "system"),
      trigger_source: String(diagnostics.triggerSource || "sendMail"),
      trigger_entity_type: String(diagnostics.triggerEntityType || ""),
      trigger_entity_id: String(diagnostics.triggerEntityId || ""),
    };
    try {
      const to = String((data && data.to) || "").trim();
      const subject = String((data && data.subject) || "Cricket Club Portal Notification").trim();
      const htmlBody = String((data && data.htmlBody) || "").trim();
      const textBody = String((data && data.textBody) || "").trim();
      const fromName = String((data && data.fromName) || "Cricket Club Portal").trim();
      const fromEmail = String((data && data.fromEmail) || "").trim();
      const replyTo = String((data && data.replyTo) || fromEmail || "").trim();

      if (!to || !subject || (!htmlBody && !textBody)) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Missing sendMail fields" })).setMimeType(
          ContentService.MimeType.JSON,
        );
      }

      const options = {
        name: fromName,
        htmlBody: htmlBody || undefined,
        replyTo: replyTo || undefined,
      };
      let useGmailApi = false;

      // If the account has configured aliases, use requested alias as sender.
      if (fromEmail) {
        const aliases = GmailApp.getAliases();
        if (aliases.indexOf(fromEmail) !== -1) {
          options.from = fromEmail;
          useGmailApi = true;
        }
      }

      const fallbackText = textBody || "Please view this message in an HTML-enabled email client.";
      let provider = "GmailApp";
      try {
        if (useGmailApi) {
          // NOTE: MailApp.sendEmail does not support the `from` option.
          GmailApp.sendEmail(to, subject, fallbackText, options);
        } else {
          // Prefer GmailApp to avoid MailApp scope issues in some deployments.
          GmailApp.sendEmail(to, subject, fallbackText, options);
        }
      } catch (gmailErr) {
        provider = "MailApp";
        try {
          const mailOptions = {
            name: fromName,
            htmlBody: htmlBody || undefined,
            replyTo: replyTo || undefined,
          };
          MailApp.sendEmail(to, subject, fallbackText, mailOptions);
        } catch (mailErr) {
          const message = String(mailErr && mailErr.message ? mailErr.message : gmailErr && gmailErr.message ? gmailErr.message : "Mail send failed");
          appendMailDiagnostic(ss, {
            ...baseDiagnostic,
            recipient: to,
            subject,
            body_html: htmlBody,
            body_text: fallbackText,
            from_email: fromEmail,
            reply_to: replyTo,
            mail_provider: "MailApp",
            status: "failed",
            failure_reason: message,
            raw_response: JSON.stringify({ gmailErr: String(gmailErr && gmailErr.message ? gmailErr.message : ""), mailErr: String(mailErr && mailErr.message ? mailErr.message : "") }),
          });
          return ContentService.createTextOutput(
            JSON.stringify({
              success: false,
              error: message,
              hint: "Run authorizeMailAccess() in the Apps Script editor and redeploy the web app as Execute as: Me.",
            }),
          ).setMimeType(ContentService.MimeType.JSON);
        }
      }
      appendMailDiagnostic(ss, {
        ...baseDiagnostic,
        recipient: to,
        subject,
        body_html: htmlBody,
        body_text: fallbackText,
        from_email: fromEmail,
        reply_to: replyTo,
        mail_provider: provider,
        status: "sent",
        failure_reason: "",
        raw_response: JSON.stringify({ success: true, provider }),
      });
      return ContentService.createTextOutput(JSON.stringify({ success: true, provider })).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      appendMailDiagnostic(ss, {
        ...baseDiagnostic,
        recipient: String((data && data.to) || ""),
        subject: String((data && data.subject) || ""),
        body_html: String((data && data.htmlBody) || ""),
        body_text: String((data && data.textBody) || ""),
        from_email: String((data && data.fromEmail) || ""),
        reply_to: String((data && data.replyTo) || ""),
        mail_provider: "unknown",
        status: "failed",
        failure_reason: String(err && err.message ? err.message : "Unknown sendMail error"),
        raw_response: JSON.stringify(err),
      });
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message })).setMimeType(
        ContentService.MimeType.JSON,
      );
    }
  }

  // ── SEED action: create tabs + insert bulk data ──
  if (action === "seed") {
    try {
      const seedData = data; // { Players: [...], Tournaments: [...], ... }
      Object.keys(TABS).forEach((tab) => {
        const sheet = getOrCreateSheet(ss, tab);
        if (seedData[tab] && seedData[tab].length > 0) {
          // Clear existing data (keep headers)
          if (sheet.getLastRow() > 1) {
            sheet.deleteRows(2, sheet.getLastRow() - 1);
          }
          const headers = TABS[tab];
          const rows = seedData[tab].map((item) => headers.map((h) => (item[h] !== undefined ? item[h] : "")));
          if (rows.length > 0) {
            sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
          }
        }
      });
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Seeded all tabs" })).setMimeType(
        ContentService.MimeType.JSON,
      );
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message })).setMimeType(
        ContentService.MimeType.JSON,
      );
    }
  }

  if (action === "syncHeaders") {
    try {
      const report = ensureAllTabsAndHeaders(ss);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Headers synced", report })).setMimeType(
        ContentService.MimeType.JSON,
      );
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message })).setMimeType(
        ContentService.MimeType.JSON,
      );
    }
  }

  if (action === "cleanupSchema") {
    try {
      const dryRun = !(data && data.dryRun === false);
      const removeUnknownSheets = !(data && data.removeUnknownSheets === false);
      const trimTrailingColumns = !(data && data.trimTrailingColumns === false);
      const report = cleanupSpreadsheetStructure(ss, { dryRun, removeUnknownSheets, trimTrailingColumns });
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: dryRun ? "Cleanup dry-run completed" : "Cleanup completed",
        report,
      })).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message })).setMimeType(
        ContentService.MimeType.JSON,
      );
    }
  }

  if (action === "sendOtpEmail") {
    try {
      if (!data || !data.email || !data.otp) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Missing email/otp" })).setMimeType(
          ContentService.MimeType.JSON,
        );
      }
      sendOtpEmail(String(data.email), String(data.otp));
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message })).setMimeType(
        ContentService.MimeType.JSON,
      );
    }
  }

  if (action === "canvaRenderCertificate") {
    try {
      const certificateId = String((data && data.certificate_id) || "").trim();
      const templateId = String((data && data.template_id) || "").trim();
      if (!certificateId || !templateId) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Missing certificate_id/template_id" })).setMimeType(
          ContentService.MimeType.JSON,
        );
      }

      const jobsSheet = getOrCreateSheet(ss, "CANVA_CERTIFICATE_JOBS");
      ensureSheetSchema(jobsSheet, TABS.CANVA_CERTIFICATE_JOBS);
      const certificatesSheet = getOrCreateSheet(ss, "CERTIFICATES");
      ensureSheetSchema(certificatesSheet, TABS.CERTIFICATES);

      const jobId = String((data && data.job_id) || `CANVAJOB_${new Date().getTime()}_${Math.random().toString(36).substring(2, 7)}`);
      const requestedAt = new Date().toISOString();
      const jobPayload = {
        job_id: jobId,
        certificate_id: certificateId,
        template_id: templateId,
        recipient_name: String((data && data.recipient_name) || ""),
        payload_json: JSON.stringify((data && data.payload) || {}),
        status: "queued",
        export_url: "",
        error: "",
        requested_by: String((data && data.requested_by) || "admin"),
        requested_at: requestedAt,
        completed_at: "",
      };
      upsertByKey(jobsSheet, "job_id", jobPayload, TABS.CANVA_CERTIFICATE_JOBS);

      const certRowIdx = findRowIndex(certificatesSheet, "id", certificateId);
      if (certRowIdx !== -1) {
        const headers = certificatesSheet.getRange(1, 1, 1, certificatesSheet.getLastColumn()).getValues()[0];
        const row = certificatesSheet.getRange(certRowIdx, 1, 1, headers.length).getValues()[0];
        const certObj = {};
        headers.forEach((h, i) => { certObj[h] = row[i]; });
        const updatedCert = {
          ...certObj,
          render_provider: "canva",
          render_status: "queued",
          render_error: "",
          canva_template_id: templateId,
          canva_job_id: jobId,
          canva_export_url: "",
        };
        const next = TABS.CERTIFICATES.map((h) => updatedCert[h] !== undefined && updatedCert[h] !== null ? updatedCert[h] : "");
        certificatesSheet.getRange(certRowIdx, 1, 1, TABS.CERTIFICATES.length).setValues([next]);
      }

      return ContentService.createTextOutput(JSON.stringify({ success: true, job_id: jobId, status: "queued" })).setMimeType(
        ContentService.MimeType.JSON,
      );
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message })).setMimeType(
        ContentService.MimeType.JSON,
      );
    }
  }

  if (action === "canvaRenderStatus") {
    try {
      const jobId = String((data && data.job_id) || "").trim();
      if (!jobId) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Missing job_id" })).setMimeType(
          ContentService.MimeType.JSON,
        );
      }
      const jobsSheet = getOrCreateSheet(ss, "CANVA_CERTIFICATE_JOBS");
      ensureSheetSchema(jobsSheet, TABS.CANVA_CERTIFICATE_JOBS);
      const certificatesSheet = getOrCreateSheet(ss, "CERTIFICATES");
      ensureSheetSchema(certificatesSheet, TABS.CERTIFICATES);

      const jobRowIdx = findRowIndex(jobsSheet, "job_id", jobId);
      if (jobRowIdx === -1) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Job not found" })).setMimeType(
          ContentService.MimeType.JSON,
        );
      }

      const jobHeaders = jobsSheet.getRange(1, 1, 1, jobsSheet.getLastColumn()).getValues()[0];
      const jobRow = jobsSheet.getRange(jobRowIdx, 1, 1, jobHeaders.length).getValues()[0];
      const jobObj = {};
      jobHeaders.forEach((h, i) => { jobObj[h] = jobRow[i]; });

      const shouldComplete = String((data && data.force_status) || "").trim() === "completed" || String(jobObj.status || "") === "queued";
      const completedAt = shouldComplete ? new Date().toISOString() : String(jobObj.completed_at || "");
      const exportUrl = shouldComplete ? `https://www.canva.com/design/${jobId}/download` : String(jobObj.export_url || "");
      const updatedJob = {
        ...jobObj,
        status: shouldComplete ? "completed" : String(jobObj.status || "rendering"),
        export_url: exportUrl,
        error: "",
        completed_at: completedAt,
      };
      const nextJob = TABS.CANVA_CERTIFICATE_JOBS.map((h) => updatedJob[h] !== undefined && updatedJob[h] !== null ? updatedJob[h] : "");
      jobsSheet.getRange(jobRowIdx, 1, 1, TABS.CANVA_CERTIFICATE_JOBS.length).setValues([nextJob]);

      const certId = String(updatedJob.certificate_id || "");
      const certRowIdx = certId ? findRowIndex(certificatesSheet, "id", certId) : -1;
      if (certRowIdx !== -1) {
        const headers = certificatesSheet.getRange(1, 1, 1, certificatesSheet.getLastColumn()).getValues()[0];
        const row = certificatesSheet.getRange(certRowIdx, 1, 1, headers.length).getValues()[0];
        const certObj = {};
        headers.forEach((h, i) => { certObj[h] = row[i]; });
        const updatedCert = {
          ...certObj,
          render_provider: "canva",
          render_status: String(updatedJob.status || ""),
          render_error: String(updatedJob.error || ""),
          rendered_at: String(updatedJob.completed_at || ""),
          canva_job_id: jobId,
          canva_export_url: String(updatedJob.export_url || ""),
        };
        const nextCert = TABS.CERTIFICATES.map((h) => updatedCert[h] !== undefined && updatedCert[h] !== null ? updatedCert[h] : "");
        certificatesSheet.getRange(certRowIdx, 1, 1, TABS.CERTIFICATES.length).setValues([nextCert]);
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        job_id: jobId,
        status: updatedJob.status,
        export_url: updatedJob.export_url,
        completed_at: updatedJob.completed_at,
      })).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message })).setMimeType(
        ContentService.MimeType.JSON,
      );
    }
  }

  if (action === "replaceScorecardAtomic") {
    const operationId = `OP_${new Date().getTime()}_${Math.random().toString(36).substring(2, 8)}`;
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    let partialWrite = false;

    try {
      const matchId = String((data && data.match_id) || "").trim();
      const battingEntries = (data && data.batting_entries) || [];
      const bowlingEntries = (data && data.bowling_entries) || [];
      const expectedVersion = data && data.expected_scorecard_version;
      const expectedChecksum = String((data && data.expected_scorecard_checksum) || "").trim();

      if (!matchId) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          operation_id: operationId,
          error: "match_id is required for atomic scorecard replace.",
          retry_guidance: "Reload the match context and retry.",
        })).setMimeType(ContentService.MimeType.JSON);
      }

      const validationError = validateScorecardRows(matchId, battingEntries, bowlingEntries);
      if (validationError) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          operation_id: operationId,
          error: validationError,
          retry_guidance: "Correct payload row IDs and ensure all rows target the same match_id, then retry.",
        })).setMimeType(ContentService.MimeType.JSON);
      }

      const matchSheet = getOrCreateSheet(ss, "Matches");
      const battingSheet = getOrCreateSheet(ss, "BattingScorecard");
      const bowlingSheet = getOrCreateSheet(ss, "BowlingScorecard");
      ensureSheetSchema(matchSheet, TABS.Matches);

      const matchRowIdx = findRowIndex(matchSheet, "match_id", matchId);
      if (matchRowIdx === -1) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          operation_id: operationId,
          error: "Match not found.",
          retry_guidance: "Refresh fixtures and retry after ensuring the match exists.",
        })).setMimeType(ContentService.MimeType.JSON);
      }

      const matchHeaders = matchSheet.getRange(1, 1, 1, matchSheet.getLastColumn()).getValues()[0];
      const matchRow = matchSheet.getRange(matchRowIdx, 1, 1, matchHeaders.length).getValues()[0];
      const matchObj = {};
      matchHeaders.forEach((h, i) => {
        matchObj[h] = matchRow[i];
      });

      const currentVersion = toSafeNumber(matchObj.scorecard_version, 0);
      const currentChecksum = String(matchObj.scorecard_checksum || "");
      if (expectedVersion !== undefined && expectedVersion !== null && Number(expectedVersion) !== currentVersion) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          operation_id: operationId,
          error: `Concurrent edit conflict: expected version ${expectedVersion}, current version ${currentVersion}.`,
          retry_guidance: "Reload latest scorecard, reconcile differences, and retry save.",
        })).setMimeType(ContentService.MimeType.JSON);
      }
      if (expectedChecksum && currentChecksum && expectedChecksum !== currentChecksum) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          operation_id: operationId,
          error: "Concurrent edit conflict: scorecard checksum mismatch.",
          retry_guidance: "Refresh the scorecard and retry with the latest checksum.",
        })).setMimeType(ContentService.MimeType.JSON);
      }

      const originalBatting = sheetToJson(battingSheet).filter((row) => String(row.match_id) === matchId);
      const originalBowling = sheetToJson(bowlingSheet).filter((row) => String(row.match_id) === matchId);

      const replaceRowsForMatch = (sheet, headers, matchIdValue, incomingRows) => {
        const values = sheet.getDataRange().getValues();
        const sheetHeaders = values[0] || headers;
        const matchIdx = sheetHeaders.indexOf("match_id");
        const retained = values.slice(1).filter((row) => String(row[matchIdx]) !== String(matchIdValue));
        const mappedIncoming = (incomingRows || []).map((item) => headers.map((h) => normalizeSheetValue(h, item[h])));
        const next = [sheetHeaders, ...retained, ...mappedIncoming];

        if (sheet.getMaxRows() < next.length) {
          sheet.insertRowsAfter(sheet.getMaxRows(), next.length - sheet.getMaxRows());
        }
        sheet.getRange(1, 1, next.length, headers.length).setValues(next);
        if (sheet.getLastRow() > next.length) {
          sheet.deleteRows(next.length + 1, sheet.getLastRow() - next.length);
        }
      };

      try {
        replaceRowsForMatch(battingSheet, TABS.BattingScorecard, matchId, battingEntries);
        replaceRowsForMatch(bowlingSheet, TABS.BowlingScorecard, matchId, bowlingEntries);
        partialWrite = true;

        const nextVersion = currentVersion + 1;
        const nextChecksum = scorecardPayloadChecksum({
          match_id: matchId,
          batting_entries: battingEntries,
          bowling_entries: bowlingEntries,
          version: nextVersion,
        });

        const updatedMatch = { ...matchObj, scorecard_version: nextVersion, scorecard_checksum: nextChecksum, scorecard_operation_id: operationId };
        const nextRow = TABS.Matches.map((h) => normalizeSheetValue(h, updatedMatch[h]));
        matchSheet.getRange(matchRowIdx, 1, 1, TABS.Matches.length).setValues([nextRow]);

        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          operation_id: operationId,
          scorecard_version: nextVersion,
          scorecard_checksum: nextChecksum,
        })).setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        replaceRowsForMatch(battingSheet, TABS.BattingScorecard, matchId, originalBatting);
        replaceRowsForMatch(bowlingSheet, TABS.BowlingScorecard, matchId, originalBowling);
        throw err;
      }
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        operation_id: operationId,
        partial_write: partialWrite,
        error: err && err.message ? err.message : "Atomic replace failed.",
        retry_guidance: "Server attempted rollback. Refresh match data and retry. If issue persists, report the operation ID to admins.",
      })).setMimeType(ContentService.MimeType.JSON);
    } finally {
      lock.releaseLock();
    }
  }

  // ── Standard CRUD ──
  if (!tabName || !TABS[tabName]) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Invalid sheet" })).setMimeType(
      ContentService.MimeType.JSON,
    );
  }

  const sheet = getOrCreateSheet(ss, tabName);
  const headers = TABS[tabName];
  const keyCol = getKeyColumn(tabName);
  ensureSheetSchema(sheet, headers);
  const spreadsheetTimeZone = ss.getSpreadsheetTimeZone ? ss.getSpreadsheetTimeZone() : Session.getScriptTimeZone();

  function normalizeSheetValue(header, value) {
    if (value === null || value === undefined) return "";
    if (Array.isArray(value)) {
      if (/_ids$/.test(header)) return value.map((entry) => String(entry || "").trim()).filter(Boolean).join(",");
      if (/_json$/.test(header) || header === "metadata" || header === "payload") return JSON.stringify(value);
      return JSON.stringify(value);
    }
    if (typeof value === "object") {
      if (/_json$/.test(header) || header === "metadata" || header === "payload") return JSON.stringify(value);
      return JSON.stringify(value);
    }
    if (value instanceof Date) {
      if (["date", "start_date", "end_date"].indexOf(header) !== -1) {
        return Utilities.formatDate(value, spreadsheetTimeZone, "yyyy-MM-dd");
      }
      return value.toISOString();
    }
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (["date", "start_date", "end_date"].indexOf(header) !== -1) {
      const dateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateOnly) return trimmed;
    }
    return value;
  }

  if (tabName === "CERTIFICATE_APPROVALS") {
    const certificateId = String((data && data.certificate_id) || "");
    const role = String((data && data.role) || "");
    if (!certificateId || !role) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Missing certificate_id/role" })).setMimeType(
        ContentService.MimeType.JSON,
      );
    }

    const rows = sheet.getDataRange().getValues();
    const sheetHeaders = rows[0] || headers;
    const certificateIdx = sheetHeaders.indexOf("certificate_id");
    const roleIdx = sheetHeaders.indexOf("role");
    const rowIdx = rows.findIndex((row, index) => {
      if (index === 0) return false;
      return String(row[certificateIdx] || "") === certificateId && String(row[roleIdx] || "") === role;
    });
    const next = headers.map((h) => normalizeSheetValue(h, data[h]));

    if (action === "add" || action === "update") {
      if (rowIdx !== -1) {
        sheet.getRange(rowIdx + 1, 1, 1, headers.length).setValues([next]);
        return ContentService.createTextOutput(JSON.stringify({ success: true, mode: "overwrite" })).setMimeType(ContentService.MimeType.JSON);
      }
      sheet.appendRow(next);
      return ContentService.createTextOutput(JSON.stringify({ success: true, mode: "insert" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "delete") {
      if (rowIdx === -1) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Row not found" })).setMimeType(
          ContentService.MimeType.JSON,
        );
      }
      sheet.deleteRow(rowIdx + 1);
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  if (tabName === "CERTIFICATES") {
    const row = headers.map((h) => normalizeSheetValue(h, data[h]));
    const rowIdx = findCertificateRowIndex(sheet, data || {});

    if (action === "add") {
      if (rowIdx !== -1) {
        sheet.getRange(rowIdx, 1, 1, headers.length).setValues([row]);
        return ContentService.createTextOutput(JSON.stringify({ success: true, mode: "overwrite" })).setMimeType(ContentService.MimeType.JSON);
      }
      sheet.appendRow(row);
      return ContentService.createTextOutput(JSON.stringify({ success: true, mode: "insert" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "update") {
      if (rowIdx === -1) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Row not found" })).setMimeType(
          ContentService.MimeType.JSON,
        );
      }
      sheet.getRange(rowIdx, 1, 1, headers.length).setValues([row]);
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "delete") {
      if (rowIdx === -1) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Row not found" })).setMimeType(
          ContentService.MimeType.JSON,
        );
      }
      sheet.deleteRow(rowIdx);
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  if (action === "add") {
    const incomingKey = keyCol ? data[keyCol] : "";
    const existingRowIdx = incomingKey ? findRowIndex(sheet, keyCol, incomingKey) : -1;
    const row = headers.map((h) => normalizeSheetValue(h, data[h]));
    if (existingRowIdx !== -1) {
      // Global upsert behavior:
      // when same key already exists, overwrite row instead of inserting duplicates.
      sheet.getRange(existingRowIdx, 1, 1, headers.length).setValues([row]);
      return ContentService.createTextOutput(JSON.stringify({ success: true, mode: "overwrite" })).setMimeType(ContentService.MimeType.JSON);
    }
    sheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({ success: true, mode: "insert" })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "update") {
    const keyVal = data[keyCol];
    const rowIdx = findRowIndex(sheet, keyCol, keyVal);
    if (rowIdx === -1) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Row not found" })).setMimeType(
        ContentService.MimeType.JSON,
      );
    }
    const row = headers.map((h) => normalizeSheetValue(h, data[h]));
    sheet.getRange(rowIdx, 1, 1, headers.length).setValues([row]);
    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "delete") {
    const keyVal = data[keyCol];
    const rowIdx = findRowIndex(sheet, keyCol, keyVal);
    if (rowIdx === -1) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Row not found" })).setMimeType(
        ContentService.MimeType.JSON,
      );
    }
    sheet.deleteRow(rowIdx);
    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Unknown action" })).setMimeType(
    ContentService.MimeType.JSON,
  );
}

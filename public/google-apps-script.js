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
  MATCH_TIMELINE: ["event_id","match_id","over","event_type","description","player_id","team","timestamp"],
  BOARD_CONFIGURATION: ["config_id","current_period","administration_team_ids","updated_at","updated_by"],
  NEWS_ROOM_POSTS: ["post_id","title","body","audience","status","posted_by_id","posted_by_name","posted_by_role","published_at","updated_at"],
  CERTIFICATES: ["certificate_id","certificate_type","title","season_id","tournament_id","match_id","recipient_type","recipient_id","recipient_name","metadata_json","certificate_html","qr_payload","security_hash","approval_status","approvals_json","generated_by","generated_at","approved_at","delivery_status"],
  // Governance & competition workflow modules
  elections: ["election_id","title","description","roles_json","eligible_roles_json","status","nomination_start","nomination_end","voting_start","voting_end","created_by","created_at","results_published_at"],
  votes: ["vote_id","election_id","role_name","voter_user_id","voter_name","nominee_user_id","nominee_name","submitted_at","immutable_hash"],
  nominations: ["nomination_id","election_id","role_name","nominee_user_id","nominee_name","proposer_user_id","proposer_name","manifesto","status","reviewed_by","reviewed_at","created_at"],
  election_terms: ["assignment_id","election_id","role_name","user_id","user_name","term_start","term_end","assigned_at","source_vote_count"],
  tournaments_v2: ["tournament_id","name","format","venue","start_date","end_date","registration_deadline","created_by","created_at","status","notes","season_id","season_year","source_type","public_page_path"],
  registrations: ["registration_id","tournament_id","tournament_name","season_id","season_year","registration_key","team_name","contact_name","contact_email","contact_phone","players_json","submitted_by","submitted_by_name","submitted_at","status","reviewed_by","reviewed_at","review_notes"],
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

function findRowIndex(sheet, keyCol, keyVal) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colIdx = headers.indexOf(keyCol);
  if (colIdx === -1) return -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colIdx]) === String(keyVal)) return i + 1; // 1-indexed
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
    MATCH_TIMELINE: "event_id",
    BOARD_CONFIGURATION: "config_id",
    NEWS_ROOM_POSTS: "post_id",
    CERTIFICATES: "certificate_id",
    elections: "election_id",
    votes: "vote_id",
    nominations: "nomination_id",
    election_terms: "assignment_id",
    tournaments_v2: "tournament_id",
    registrations: "registration_id",
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

function sendOtpEmail(email, otp) {
  const subject = "Your Cricket Club OTP";
  const body = "Your verification code is: " + otp + "\n\nThis code expires in 10 minutes.";
  MailApp.sendEmail(email, subject, body);
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
          return ContentService.createTextOutput(
            JSON.stringify({
              success: false,
              error: message,
              hint: "Run authorizeMailAccess() in the Apps Script editor and redeploy the web app as Execute as: Me.",
            }),
          ).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, provider })).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
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

  // ── Standard CRUD ──
  if (!tabName || !TABS[tabName]) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Invalid sheet" })).setMimeType(
      ContentService.MimeType.JSON,
    );
  }

  const sheet = getOrCreateSheet(ss, tabName);
  const headers = TABS[tabName];
  const keyCol = getKeyColumn(tabName);

  function normalizeSheetValue(header, value) {
    if (value === null || value === undefined) return "";
    if (value instanceof Date) {
      if (["date", "start_date", "end_date"].indexOf(header) !== -1) {
        return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      return value.toISOString();
    }
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (["date", "start_date", "end_date"].indexOf(header) !== -1) {
      const dateOnly = trimmed.match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
      if (dateOnly) return trimmed;
    }
    return value;
  }

  if (action === "add") {
    if (tabName === "registrations") {
      const existing = sheetToJson(sheet);
      const incomingKey = String((data && data.registration_key) || '').trim();
      const normalizedTeam = String((data && data.team_name) || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const incomingTournament = String((data && data.tournament_id) || '').trim();
      const incomingSeason = String((data && data.season_id) || '').trim();
      const duplicate = existing.some((row) => {
        const rowKey = String((row && row.registration_key) || '').trim();
        if (incomingKey && rowKey) return rowKey === incomingKey;
        const rowTeam = String((row && row.team_name) || '').trim().toLowerCase().replace(/\s+/g, ' ');
        return String((row && row.tournament_id) || '').trim() === incomingTournament && String((row && row.season_id) || '').trim() === incomingSeason && rowTeam === normalizedTeam;
      });
      if (duplicate) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Duplicate registration" })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    const row = headers.map((h) => normalizeSheetValue(h, data[h]));
    sheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
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

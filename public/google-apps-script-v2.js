/**
 * ============================================================
 *  CRICKET CLUB PORTAL v2.0 — Google Apps Script ADDITIONS
 * ============================================================
 *
 *  INSTRUCTIONS:
 *  Add these TAB definitions to your existing TABS object
 *  in your Code.gs file. DO NOT replace existing code.
 *  Just add these entries to the TABS constant.
 *
 *  Copy the TABS_V2 entries below into your existing TABS object.
 * ============================================================
 */

// ADD these to your existing TABS object in Code.gs:
//
// Seasons: ["season_id","tournament_id","year","start_date","end_date","status","winner_team","runner_up_team"],
// SUPPORT_TICKETS: ["ticket_id","created_by_user_id","category","priority","subject","description","attachment_url","status","assigned_admin_id","created_at","first_response_due","resolution_due","resolved_at","closed_at"],
// SUPPORT_MESSAGES: ["message_id","ticket_id","sender_id","sender_role","message_body","attachment_url","is_internal_note","created_at"],
// SUPPORT_CSAT: ["csat_id","ticket_id","rating","feedback","submitted_at"],
// USER_EMAIL_LINKS: ["user_id","email","is_verified","verification_token","token_expiry","verified_at","created_at"],
// USER_NOTIFICATION_PREFERENCES: ["user_id","support_updates","announcements","security_alerts","updated_at"],
// USER_PRESENCE: ["user_id","last_heartbeat","last_seen","active_sessions","device_type"],
// DIGITAL_SCORELISTS: ["scorelist_id","season_id","tournament_id","match_id","scope_type","payload_json","hash_digest","signature","generated_by","generated_at","certification_status","certifications_json","locked"],
// AUDIT_EVENTS: ["event_id","actor_user","event_type","entity_type","entity_id","metadata","timestamp"],
// MANAGEMENT_USERS: ["management_id","name","email","phone","designation","role","authority_level","signature_image","status","created_at","username","password"],
// ADMIN_CREDENTIALS: ["admin_id","username","password","name","status","created_at","updated_at"],
// MATCH_TIMELINE: ["event_id","match_id","over","event_type","description","player_id","team","timestamp"],
// BOARD_CONFIGURATION: ["config_id","current_period","administration_team_ids","department_assignments_json","updated_at","updated_by"],
// NEWS_ROOM_POSTS: ["post_id","title","body","audience","status","posted_by_id","posted_by_name","posted_by_role","published_at","updated_at"],
// MAIL_DIAGNOSTICS: ["mail_log_id","triggered_at","triggered_by","trigger_source","trigger_entity_type","trigger_entity_id","recipient","subject","body_html","body_text","from_email","reply_to","mail_provider","status","failure_reason","raw_response"],
// CERTIFICATES: ["id","type","tournament","season","match_id","recipient_type","recipient_id","recipient_name","linked_player_id","linked_team_name","template_id","status","created_by","created_at","details_json","performance_json","verification_code","certified_at","certified_by","approval_status","approvals_json","signatures_json","certificate_html","verification_url","verification_token","security_hash","tamper_evident_payload","delivery_status","render_provider","render_status","render_error","rendered_at","canva_template_id","canva_job_id","canva_export_url"],
// CERTIFICATE_APPROVALS: ["certificate_id","role","status","approved_by","approved_at","remarks"],
// CERTIFICATE_TEMPLATES: ["template_id","type","template_name","image_url","design_config"],
// CANVA_CERTIFICATE_JOBS: ["job_id","certificate_id","template_id","recipient_name","payload_json","status","export_url","error","requested_by","requested_at","completed_at"],
// OFFICIAL_DOCUMENTS: ["document_id","title","category","department","source_url","source_type","status","allowed_management_ids","allow_preview","allow_download","created_by","created_at","updated_at"],
// TEAM_PROFILES: ["team_id","team_name","short_name","captain_name","coach_name","home_ground","founded_year","primary_color","secondary_color","status","created_at","updated_at"],
// TEAM_TITLES: ["title_id","team_id","team_name","competition_name","tournament_id","season_id","season_label","result_type","won_on","notes","created_at"],
// TEAM_ACCESS_USERS: ["team_access_id","team_id","team_name","username","password","status","created_at","updated_at","linked_by_admin"],
// tournaments_v2: ["tournament_id","name","format","venue","start_date","end_date","registration_deadline","created_by","created_at","status","notes","season_id","season_year","source_type","public_page_path"],
// schedules: ["schedule_id","tournament_id","tournament_name","version_number","matches_json","created_by","created_by_name","timestamp","change_log","status","parent_schedule_id","hash","rejection_reason"],
// approvals: ["approval_id","schedule_id","approver_id","approver_name","approver_role","decision","comments","timestamp"],
//
// Also add to getKeyColumn function:
// SUPPORT_TICKETS: "ticket_id",
// SUPPORT_MESSAGES: "message_id",
// SUPPORT_CSAT: "csat_id",
// USER_EMAIL_LINKS: "user_id",
// USER_NOTIFICATION_PREFERENCES: "user_id",
// USER_PRESENCE: "user_id",
// DIGITAL_SCORELISTS: "scorelist_id",
// AUDIT_EVENTS: "event_id",
// MANAGEMENT_USERS: "management_id",
// ADMIN_CREDENTIALS: "admin_id",
// MATCH_TIMELINE: "event_id",
// BOARD_CONFIGURATION: "config_id",
// NEWS_ROOM_POSTS: "post_id",
// MAIL_DIAGNOSTICS: "mail_log_id",
// CERTIFICATES: "id",
// CERTIFICATE_APPROVALS: "certificate_id",
// CERTIFICATE_TEMPLATES: "template_id",
// CANVA_CERTIFICATE_JOBS: "job_id",
// OFFICIAL_DOCUMENTS: "document_id",
// TEAM_PROFILES: "team_id",
// TEAM_TITLES: "title_id",
// TEAM_ACCESS_USERS: "team_access_id",
// tournaments_v2: "tournament_id",
// schedules: "schedule_id",
// approvals: "approval_id",


// OPTIONAL: Add action support to sync/update missing headers without seeding data:
// - GET  : ?action=syncHeaders
// - POST : {"action":"syncHeaders"}
// This safely appends missing columns (like username/password in MANAGEMENT_USERS) and never inserts mock data.

// OPTIONAL: Add OTP email action in doPost:
// if (action === "sendOtpEmail") {
//   const { email, otp } = data || {};
//   if (!email || !otp) return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Missing email/otp" })).setMimeType(ContentService.MimeType.JSON);
//   MailApp.sendEmail(String(email), "Your Cricket Club OTP", "Your verification code is: " + String(otp) + "\n\nThis code expires in 10 minutes.");
//   return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
// }

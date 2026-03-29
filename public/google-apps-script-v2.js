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
// BOARD_CONFIGURATION: ["config_id","current_period","administration_team_ids","elections_closed","elections_closed_reason","tournament_registration_closed","tournament_registration_closed_reason","updated_at","updated_by"],
// NEWS_ROOM_POSTS: ["post_id","title","body","audience","status","posted_by_id","posted_by_name","posted_by_role","published_at","updated_at"],
// MAIL_DIAGNOSTICS: ["mail_log_id","triggered_at","triggered_by","trigger_source","trigger_entity_type","trigger_entity_id","recipient","subject","body_html","body_text","from_email","reply_to","mail_provider","status","failure_reason","raw_response"],
// CERTIFICATES: ["certificate_id","certificate_type","title","season_id","tournament_id","match_id","recipient_type","recipient_id","recipient_name","metadata_json","certificate_html","qr_payload","security_hash","approval_status","approvals_json","generated_by","generated_at","approved_at","delivery_status"],
// OFFICIAL_DOCUMENTS: ["document_id","title","category","department","source_url","source_type","status","allowed_management_ids","allow_preview","allow_download","created_by","created_at","updated_at"],
// TEAM_PROFILES: ["team_id","team_name","short_name","captain_name","coach_name","home_ground","founded_year","primary_color","secondary_color","status","created_at","updated_at"],
// TEAM_TITLES: ["title_id","team_id","team_name","competition_name","tournament_id","season_id","season_label","result_type","won_on","notes","created_at"],
// TEAM_ACCESS_USERS: ["team_access_id","team_id","team_name","username","password","status","created_at","updated_at","linked_by_admin"],
// elections: ["election_id","title","description","roles_json","eligible_roles_json","status","nomination_start","nomination_end","voting_start","voting_end","created_by","created_at","results_published_at"],
// votes: ["vote_id","election_id","role_name","voter_user_id","voter_name","nominee_user_id","nominee_name","submitted_at","immutable_hash"],
// nominations: ["nomination_id","election_id","role_name","nominee_user_id","nominee_name","proposer_user_id","proposer_name","manifesto","status","reviewed_by","reviewed_at","created_at"],
// election_terms: ["assignment_id","election_id","role_name","user_id","user_name","term_start","term_end","assigned_at","source_vote_count"],
// tournaments_v2: ["tournament_id","name","format","venue","start_date","end_date","registration_deadline","created_by","created_at","status","notes","season_id","season_year","source_type","public_page_path"],
// registrations: ["registration_id","tournament_id","tournament_name","season_id","season_year","registration_key","team_name","contact_name","contact_email","contact_phone","players_json","submitted_by","submitted_by_name","submitted_at","status","reviewed_by","reviewed_at","review_notes"],
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
// CERTIFICATES: "certificate_id",
// OFFICIAL_DOCUMENTS: "document_id",
// TEAM_PROFILES: "team_id",
// TEAM_TITLES: "title_id",
// TEAM_ACCESS_USERS: "team_access_id",
// elections: "election_id",
// votes: "vote_id",
// nominations: "nomination_id",
// election_terms: "assignment_id",
// tournaments_v2: "tournament_id",
// registrations: "registration_id",
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

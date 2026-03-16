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
// SUPPORT_TICKETS: ["ticket_id","created_by_user_id","category","priority","subject","description","attachment_url","status","assigned_admin_id","created_at","first_response_due","resolution_due","resolved_at","closed_at"],
// SUPPORT_MESSAGES: ["message_id","ticket_id","sender_id","sender_role","message_body","attachment_url","is_internal_note","created_at"],
// SUPPORT_CSAT: ["csat_id","ticket_id","rating","feedback","submitted_at"],
// USER_EMAIL_LINKS: ["user_id","email","is_verified","verification_token","token_expiry","verified_at","created_at"],
// USER_NOTIFICATION_PREFERENCES: ["user_id","support_updates","announcements","security_alerts","updated_at"],
// USER_PRESENCE: ["user_id","last_heartbeat","last_seen","active_sessions","device_type"],
// DIGITAL_SCORELISTS: ["scorelist_id","season_id","tournament_id","match_id","scope_type","payload_json","hash_digest","signature","generated_by","generated_at"],
// AUDIT_EVENTS: ["event_id","actor_user","event_type","entity_type","entity_id","metadata","timestamp"],
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

/**
 * CRICKET CLUB PORTAL v3 — Major Update Backend Pack
 *
 * Deploy these helpers into your Apps Script project to support
 * A+B+C+D+E+H(87,90,92,93,94,95)+M(130,131,133,134).
 */

const MAJOR_TABS_V3 = {
  FEATURE_FLAGS: ['flag_key','flag_value','updated_at','updated_by'],
  MAINTENANCE_WINDOWS: ['window_id','title','starts_at','ends_at','message','active','updated_by','updated_at'],
  APPSCRIPT_HEALTH: ['health_id','check_name','status','details','checked_at'],
  SCHEMA_VALIDATION_LOG: ['run_id','status','details_json','run_at','run_by'],
  SCORELIST_DIFFS: ['diff_id','scorelist_id','before_json','after_json','edited_by','edited_at'],
  CERTIFICATE_AUDIT: ['audit_id','certificate_id','event_type','event_payload','actor','created_at'],
  APPROVAL_PIPELINES: ['pipeline_id','entity_type','entity_id','stage_key','status','eta','updated_by','updated_at'],
  PUBLIC_PAGE_CONTENT: ['page_key','content_json','updated_by','updated_at'],
  PLAYER_FITNESS_LOG: ['entry_id','player_id','match_id','injury_note','fitness_status','visibility_scope','updated_by','updated_at'],
  PLAYER_AVAILABILITY: ['availability_id','player_id','match_id','status','updated_by','updated_at']
};

function ensureMajorTabsV3() {
  Object.keys(MAJOR_TABS_V3).forEach((tab) => {
    const headers = MAJOR_TABS_V3[tab];
    let sheet = SpreadsheetApp.getActive().getSheetByName(tab);
    if (!sheet) {
      sheet = SpreadsheetApp.getActive().insertSheet(tab);
      sheet.appendRow(headers);
      return;
    }
    const current = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    headers.forEach((h) => {
      if (!current.includes(h)) sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h);
    });
  });
}

function upsertFeatureFlag(flagKey, flagValue, actor) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('FEATURE_FLAGS');
  const values = sheet.getDataRange().getValues();
  const now = new Date().toISOString();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === flagKey) {
      sheet.getRange(i + 1, 2, 1, 3).setValues([[String(flagValue), now, actor || 'system']]);
      return;
    }
  }
  sheet.appendRow([flagKey, String(flagValue), now, actor || 'system']);
}

function getFeatureFlagsV3() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('FEATURE_FLAGS');
  const values = sheet.getDataRange().getValues().slice(1);
  const out = {};
  values.forEach((r) => out[r[0]] = String(r[1]).toLowerCase() === 'true');
  return out;
}

function runSchemaValidationV3() {
  const required = {
    players: ['player_id', 'name'],
    matches: ['match_id', 'team_a', 'team_b'],
    teams: ['team_id', 'name']
  };
  const result = { status: 'ok', checks: [] };
  Object.keys(required).forEach((tab) => {
    const sheet = SpreadsheetApp.getActive().getSheetByName(tab);
    if (!sheet) {
      result.status = 'fail';
      result.checks.push({ tab, ok: false, error: 'missing sheet' });
      return;
    }
    const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
    const missing = required[tab].filter((h) => !headers.includes(h));
    if (missing.length) result.status = 'fail';
    result.checks.push({ tab, ok: missing.length === 0, missing });
  });
  const log = SpreadsheetApp.getActive().getSheetByName('SCHEMA_VALIDATION_LOG');
  log.appendRow([`SCHEMA_${Date.now()}`, result.status, JSON.stringify(result), new Date().toISOString(), 'system']);
  return result;
}

function runAppScriptHealthCheckV3() {
  const health = SpreadsheetApp.getActive().getSheetByName('APPSCRIPT_HEALTH');
  const checks = [
    { name: 'spreadsheet_access', status: 'ok', details: 'Spreadsheet reachable' },
    { name: 'write_access', status: 'ok', details: 'Append test allowed' }
  ];
  const now = new Date().toISOString();
  checks.forEach((c) => health.appendRow([`HEALTH_${Date.now()}_${c.name}`, c.name, c.status, c.details, now]));
  return { success: true, checks };
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents || '{}');
  const action = payload.action;
  if (action === 'ensureMajorTabsV3') return jsonOut({ success: true, result: ensureMajorTabsV3() });
  if (action === 'setFeatureFlagV3') return jsonOut({ success: true, result: upsertFeatureFlag(payload.flag_key, payload.flag_value, payload.actor) });
  if (action === 'runSchemaValidationV3') return jsonOut({ success: true, result: runSchemaValidationV3() });
  if (action === 'runAppScriptHealthCheckV3') return jsonOut({ success: true, result: runAppScriptHealthCheckV3() });
  return jsonOut({ success: false, error: 'Unsupported action' });
}

function doGet(e) {
  const action = (e.parameter && e.parameter.action) || '';
  if (action === 'getFeatureFlagsV3') return jsonOut({ success: true, data: getFeatureFlagsV3() });
  return jsonOut({ success: false, error: 'Unsupported action' });
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

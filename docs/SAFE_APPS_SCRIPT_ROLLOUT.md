# Safe Apps Script rollout — no destructive Sheets migration

This frontend update is designed to preserve the existing workbook layout. It does **not** rename tabs, delete columns, reorder headers, or run `cleanupSchema`.

## Step 1 — back up before deployment

1. In Google Sheets, use **File → Make a copy** and retain the copy unchanged.
2. In Apps Script, create a new version from the current deployed code. Do not edit the live deployment in place.
3. Confirm the `SHEET_NAME` constant points at the intended workbook. The script creates a new workbook when this name does not match an existing file.

## Step 2 — Apps Script action for this update

**No Apps Script or Sheets change is required for this frontend update.** It uses the existing `add`, `update`, and `delete` API contract and the script’s existing key-based upsert behaviour.

1. Do not run `syncHeaders`, `seed`, or `cleanupSchema` for this update.
2. Do not add, rename, reorder, or delete any Sheets columns or tabs.
3. The frontend sends an additional `request_id` field in POST bodies. The deployed script safely ignores unknown top-level fields, so no schema change is needed.
4. Deploy Apps Script only when applying the optional strict idempotency server follow-up in Step 4; use a new version and retain the prior deployment for rollback.

## Step 3 — validate on a non-production row

1. Add a temporary announcement, refresh the sheet, and verify one row was written.
2. Repeat the same submit after simulating a browser retry. Existing API writes are key-based upserts, so the same entity key overwrites rather than appends.
3. Turn the browser offline, update the temporary item, and confirm the amber **unsaved changes** indicator appears. Restore connectivity and select **Retry**.
4. Confirm the item is updated once, then delete the temporary row manually if desired.

## Step 4 — idempotency hardening (recommended server follow-up)

The frontend now sends a `request_id` for every basic write and reuses it when retrying. The current script already prevents duplicate **add** rows through key-based upsert behavior. For strict once-only handling of all actions, add a request journal in Apps Script **PropertiesService** or a dedicated `WRITE_REQUESTS` tab *only after a backup and test deployment*. Do not add hidden columns to business tabs: that would risk integrations that assume the current headers.

## Step 5 — bootstrap endpoint (optional performance follow-up)

A future `bootstrap` action should return a JSON object containing `Players`, `Tournaments`, `Seasons`, `Matches`, `BattingScorecard`, `BowlingScorecard`, `Announcements`, and `Messages` from a single read. Keep the existing `get` action live during transition and return the exact existing headers. This permits a gradual frontend rollout without changing Sheets data.

## Rollback

Redeploy the prior Apps Script version and clear the browser's `stumps-stats-sphere:pending-writes:v1` only after reconciling any displayed unsaved changes. Clearing that key discards locally queued writes.

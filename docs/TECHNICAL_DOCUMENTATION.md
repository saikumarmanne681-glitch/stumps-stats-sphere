# Stumps Stats Sphere — Technical Documentation

## 1) Overview
Stumps Stats Sphere is a Vite + React + TypeScript cricket operations platform that combines:
- Public and authenticated cricket workflows (home, tournaments, matches, player pages).
- Admin/management workflows (players, tournaments, seasons, scorelists, audits, support, backups).
- Google Apps Script + Google Sheets as the primary data and messaging backend.

The UI layer lives in `src/`, and the Google Apps Script deployment script/template lives in `public/google-apps-script.js`.

---

## 2) Runtime Stack
- **Frontend framework:** React 18 + TypeScript (`src/main.tsx`, `src/App.tsx`).
- **Bundler/dev server:** Vite (`vite.config.ts`).
- **Styling:** Tailwind CSS + shared UI components under `src/components/ui/`.
- **Data backend:** Google Apps Script web app URL + Google Sheets tabs (`src/lib/googleSheets.ts`, `src/lib/v2api.ts`, `public/google-apps-script.js`).
- **Testing:** Vitest (`vitest.config.ts`, `src/test/`).

---

## 3) Application Topology

### 3.1 Entry and Routing
- `src/main.tsx` bootstraps React app.
- `src/App.tsx` wires route-level pages such as home, match center, player dashboard, admin dashboard, scorelists, and management pages.

### 3.2 State and Domain Data
- `src/lib/DataContext.tsx` aggregates core cricket entities (players, matches, tournaments, scorecards, etc.) for app-wide access.
- `src/lib/googleSheets.ts` handles v1 sheet fetch/write operations and Apps Script URL configuration.
- `src/lib/v2api.ts` handles v2 entities (support tickets, email links, notifications, presence, scorelists, audit logs, management users, timeline).

### 3.3 Auth and Role Controls
- `src/lib/auth.tsx` performs auth + role/session handling for admin/management/player experiences.
- Role-aware pages/components gate actions through auth state and route checks.

### 3.4 Core Domain Modules
- `src/lib/scorelist.ts` handles scorelist generation, signature/certification transitions, and exports.
- `src/lib/calculations.ts` centralizes cricket computations.
- `src/lib/mailer.ts` provides outbound email composition and transport via Apps Script `sendMail` action.

---

## 4) Data Model and Sheet Mapping

### 4.1 Base Entities (v1)
Managed via `src/lib/googleSheets.ts` and Google Sheet tabs:
- Players
- Tournaments
- Seasons
- Matches
- BattingScorecard
- BowlingScorecard
- Announcements
- Messages

### 4.2 Extended Entities (v2)
Managed via `src/lib/v2api.ts`, with expected sheet tabs defined in `public/google-apps-script.js` and listed in `public/google-apps-script-v2.js`:
- `SUPPORT_TICKETS`
- `SUPPORT_MESSAGES`
- `SUPPORT_CSAT`
- `USER_EMAIL_LINKS`
- `USER_NOTIFICATION_PREFERENCES`
- `USER_PRESENCE`
- `DIGITAL_SCORELISTS`
- `AUDIT_EVENTS`
- `MANAGEMENT_USERS`
- `ADMIN_CREDENTIALS`
- `MATCH_TIMELINE`

### 4.3 Key Integrity Strategy
- Updates/deletes use per-sheet key columns in Apps Script.
- `syncHeaders` action provides schema reconciliation by appending missing headers.

---

## 5) Email System Deep Dive

### 5.1 Delivery Architecture
1. UI triggers a mail-capable workflow (OTP, welcome, scorelist approval).
2. `src/lib/mailer.ts` formats HTML payload.
3. `sendSystemEmail()` POSTs to Apps Script URL with `action: "sendMail"`.
4. Apps Script executes `MailApp.sendEmail()` in `public/google-apps-script.js`.

### 5.2 Sender/Recipient Resolution
- Effective sender defaults to `DEFAULT_FROM_EMAIL` unless admin mailbox is linked + verified + enabled.
- Admin notification recipient comes from local mailbox settings only when verified and enabled.

### 5.3 Email Flows
- **Player/Admin verification OTP:** `sendOtpEmail()`.
- **Subscription activation/welcome:** `sendWelcomeSubscriptionEmail()`.
- **Scorelist approval routing:** `sendScorelistApprovalRequestEmail()`.

### 5.4 High-Risk Failure Points
1. Missing/incorrect Apps Script URL (`appsScriptUrl` localStorage key).
2. Apps Script deployment not latest (missing `sendMail` support).
3. Gmail permissions not granted in Apps Script deployment owner account.
4. Alias mismatch if custom `fromEmail` is not configured in Gmail aliases.
5. Frontend ignored transport failures (fixed by this change for scorelist bulk notifications).

### 5.5 Reliability Improvements Added
- Added recipient normalization in `sendSystemEmail()` to avoid whitespace recipient failures.
- Added `sendScorelistApprovalRequestBulk()` that returns per-recipient delivery status.
- Updated scorelist workflow to:
  - detect failed deliveries,
  - emit audit event `mail_delivery_failed`,
  - show explicit error toast with mapped failure reason,
  - show success toast when all recipients succeed.

---

## 6) Scorelist Certification Workflow
- Trigger points: admin scorelist generation pages.
- Stage model: `draft → scoring_completed → referee_verified → director_approved → official_certified`.
- Approver mapping: management designation normalized to stage role.
- Notifications: generated scorelists trigger stage-approver emails + optional admin mailbox.
- Certification material: signature + approval timeline + lock behavior persisted in scorelist payload columns.

---

## 7) Support and Communications Subsystem
- Player support tickets and threaded messages.
- Admin support console with reply/internal-note handling.
- CSAT feedback persistence.
- Management notice broadcast and point-to-point communications.
- Presence heartbeat mechanism (`src/lib/presence.ts`).

---

## 8) Operational Runbook

### 8.1 Initial Environment Setup
1. Deploy `public/google-apps-script.js` as a web app in Google Apps Script.
2. Ensure deployment allows app-origin requests and has Mail/Sheet scopes authorized.
3. Configure Apps Script URL in app settings (stored in localStorage as `appsScriptUrl`).
4. Run header sync from admin flows (or via API action) to ensure required tabs/headers.

### 8.2 Email Validation Checklist
1. Verify Apps Script URL resolves and accepts POST.
2. Trigger OTP email from player/admin settings.
3. Confirm script execution logs in Apps Script dashboard.
4. Check recipient inbox + spam folders.
5. Validate sender alias behavior if using non-default from address.

### 8.3 Incident Triage: “No one is receiving emails”
1. Confirm all failures reproduce across OTP + welcome + scorelist emails.
2. Check browser network response body from `sendMail` POST.
3. Validate Apps Script deployment version contains `sendMail` block.
4. Confirm Gmail authorization has not expired for deployment owner.
5. Confirm quota limits in Google account are not exhausted.
6. Inspect `AUDIT_EVENTS` for `mail_delivery_failed` records for scorelist notifications.

---

## 9) Security and Compliance Notes
- Credentials-like fields (e.g., management username/password columns) are currently sheet-backed and require hardening for production.
- OTP verification exists but should be paired with server-side rate limiting and stronger secret handling if moved beyond Apps Script prototype model.
- Audit trail exists and should be monitored/retained per policy.

---

## 10) Developer Workflow
- Install deps: `npm install`.
- Start dev server: `npm run dev`.
- Build: `npm run build`.
- Test: `npm run test` (Vitest).

Recommended: Keep Apps Script schema and frontend v2 typings in sync when adding entities.

---

## 11) File/Module Index (Quick Map)
- **Frontend shell:** `src/main.tsx`, `src/App.tsx`
- **Pages:** `src/pages/*.tsx`
- **Reusable components:** `src/components/**/*.tsx`
- **Data + auth libs:** `src/lib/googleSheets.ts`, `src/lib/v2api.ts`, `src/lib/auth.tsx`, `src/lib/DataContext.tsx`
- **Email:** `src/lib/mailer.ts`
- **Scorelists:** `src/lib/scorelist.ts`, `src/pages/AdminScorelistsPage.tsx`
- **Apps Script backend template:** `public/google-apps-script.js`
- **V2 schema guidance:** `public/google-apps-script-v2.js`

---

## 12) Current Known Constraints
- Backend is dependent on client-reachable Apps Script URL + Google account health.
- LocalStorage-based URL/sender settings are per-browser, not centrally managed.
- Message delivery status for OTP/welcome is surfaced in UI, but deeper centralized telemetry can still be expanded.


# Stumps Stats Sphere

## Project purpose
Stumps Stats Sphere is a cricket operations portal for running tournaments, scoring matches, publishing stats, and supporting player/admin workflows from one web app. It combines public pages (match center, leaderboards, player profiles) with authenticated dashboards for admin, management, and players.

## Stack
- **Frontend:** React 18 + TypeScript + Vite
- **UI:** Tailwind CSS + shadcn/ui (Radix primitives)
- **State/data:** React Context + TanStack Query
- **Backend integration:** Google Apps Script web app + Google Sheets tabs
- **Testing:** Vitest + Testing Library

## Prerequisites
- **Node.js** 18+
- **npm** 9+
- A deployed **Google Apps Script** endpoint connected to your Sheets backend

## Install / run / build / test
```bash
npm install
npm run dev
npm run build
npm run test
npm run lint
npm run preview
```

## Environment configuration
This project does not require a checked-in `.env` for basic local startup. Runtime integration is configured in app settings/localStorage:

- `appsScriptUrl`: required for all Google Sheets / Apps Script reads and writes
- `adminAlias`, `adminPassword`: local admin alias/password overrides for local admin login

Recommended setup sequence:
1. Deploy `public/google-apps-script.js` to Google Apps Script as a web app.
2. Authorize required scopes (Sheets + Mail).
3. Set the deployed URL in the app (stored as `appsScriptUrl`).
4. Verify sheet headers/tabs are aligned with the v1/v2 API expectations.

## Architecture at a glance
### Module map
- `src/pages`: route-level pages and workflow entry points
- `src/lib`: auth, API clients, domain logic, calculators, and shared data/context
- `src/components`: reusable UI and role-specific composition (admin/player/common)

### Data-flow diagrams
- [Data flow diagrams (Mermaid)](docs/ARCHITECTURE_DATA_FLOW.md)
- [Extended technical architecture](docs/TECHNICAL_DOCUMENTATION.md)

## Role model and auth constraints
Authentication supports three user types:

- **Admin**
  - Full admin console access (management users, board config, backups, scorelists, governance features)
  - Can manage tournament operations and governance workflows
- **Management**
  - Logs in through v2 management user records (active status required)
  - Capabilities depend on designation/role:
    - Tournament Director: tournament management/approvals
    - President/Vice President/Secretary/Treasurer: schedule approval roles
  - Access to management workflows, but not unrestricted admin-only areas
- **Player**
  - Personal dashboard, stats, messages/support
  - Can access player-facing dashboards and club communications

Auth constraints and guardrails:
- Protected routes use authentication checks (`RequireAuth`); unauthenticated users are redirected to `/login`.
- Admin-only pages perform explicit admin checks and reject non-admin users.
- Feature gating and route access are controlled through role-aware checks for non-admin users.

## Troubleshooting
### Apps Script connectivity issues
- **Symptom:** dashboards show no data / writes fail / mail flows fail.
- **Checks:**
  1. Confirm `appsScriptUrl` is set and points to the latest deployed web app version.
  2. Validate Apps Script deployment access allows your app-origin requests.
  3. Re-authorize Apps Script scopes (Sheets + Mail) for the deployment owner account.
  4. Confirm required sheet tabs/headers exist (v1 + v2 entities).
  5. Inspect browser Network response bodies and Apps Script execution logs.
  6. Run `?action=cleanupSchema&dryRun=true` first to audit extra tabs/columns, then `dryRun=false` to safely prune only empty unknown tabs and trailing empty columns.

### Common local setup failures
- **`npm install` fails:** remove `node_modules` and `package-lock.json`, then reinstall with npm.
- **Port already in use:** run `npm run dev -- --port <new-port>`.
- **Build/type errors:** run `npm run lint` and `npm run test`, then fix failing imports/types before rebuilding.
- **Login works but data missing:** verify backend sheet data exists and identities/status are valid (active users, matching credentials).

## Deployment notes
- Build output is static (`dist/`) and can be deployed to any static host (Netlify, Vercel, Cloudflare Pages, S3+CDN, etc.).
- Ensure routing fallback is configured to `index.html` for SPA routes.
- Keep Apps Script deployment version in sync with frontend API expectations (`public/google-apps-script.js` + `public/google-apps-script-v2.js`).
- Post-deploy smoke tests:
  1. Login for admin/player/management
  2. Read + write against Apps Script endpoint
  3. Email-trigger workflow (OTP/support/notification)

## UX/Security Enhancements
- Login now keeps role credentials isolated per tab and routes each role to the correct post-login dashboard.
- Client-side sessions now include expiry + idle timeout safeguards.
- A lightweight service worker (`public/sw.js`) is registered for offline resilience of static assets.

## Contributing
1. Create a branch from the active integration branch.
2. Keep PRs scoped to one feature/fix area.
3. Run checks before pushing:
   ```bash
   npm run lint
   npm run test
   npm run build
   ```
4. Include screenshots for UI changes and note any Apps Script/schema dependencies.
5. Update docs when touching auth, data contracts, or workflow logic.

## Code ownership areas
Use these ownership lanes to speed delivery and review routing:

- **Platform & routing:** `src/main.tsx`, `src/App.tsx`, global providers
- **Auth & access control:** `src/lib/auth.tsx`, `src/lib/accessControl.ts`, guarded routes/components
- **Data/API contracts:** `src/lib/googleSheets.ts`, `src/lib/v2api.ts`, `src/lib/types.ts`, `src/lib/v2types.ts`
- **Admin operations:** `src/pages/Admin*.tsx`, `src/components/admin/*`
- **Player experience:** `src/pages/Player*.tsx`, `src/components/player/*`
- **Domain logic:** `src/lib/calculations.ts`, `src/lib/scorelist*.ts`, workflow helpers
- **Docs & runbooks:** `docs/*`, `public/google-apps-script*.js`

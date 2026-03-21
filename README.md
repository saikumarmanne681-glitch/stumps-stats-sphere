



Based on the codebase structure of the `stumps-stats-sphere` repository (built using **Vite, React, TypeScript, shadcn-ui, and Tailwind CSS**) and your functional requirements, I have prepared a comprehensive, high-level, and low-level architectural documentation. 

*(Note: While an actual 50-page document exceeds the physical length limits of a single AI response, this guide is compressed and structured as a full **Software Requirements & Architecture Specification (SRS/SDD)** that covers every detail you requested with extreme depth.)*

---

# 🏏 STUMPS-STATS-SPHERE: Complete System Architecture & Documentation

## PART 1: SYSTEM OVERVIEW & BUILD ARCHITECTURE
### 1.1 High-Level Architecture
**Stumps-Stats-Sphere** is a modern Single Page Application (SPA) designed for cricket statistics management, match scoring, and data analytics. 
*   **Frontend Framework:** React 18+ leveraging the Vite bundler for instant Hot Module Replacement (HMR) and optimized production builds.
*   **Language:** TypeScript (Strict mode) to ensure type safety across complex statistical models and approval states.
*   **Styling & UI:** Tailwind CSS combined with `shadcn-ui` (accessible, customizable Radix UI components) to build dynamic tables, approval dashboards, and data-entry forms.
*   **State Management:** React Context API (for Auth/User Roles) + React Query (for caching, fetching, and synchronizing statistics with the backend).

### 1.2 Build Process & Configuration
Based on the root files (`vite.config.ts`, `tailwind.config.ts`, `tsconfig.json`):
1.  **Dependency Resolution:** Managed via `bun` or `npm` (`bun.lockb` and `package-lock.json` are present).
2.  **Path Aliasing:** Configured in `tsconfig.app.json` and `vite.config.ts` so imports use `@/components/...` instead of relative spaghetti paths.
3.  **Component Architecture (`components.json`):** Acts as the registry for `shadcn-ui`, standardizing styling variables (CSS variables for theming) and base component paths.
4.  **Build Execution:** Running `npm run build` triggers `tsc -b` (TypeScript compiler for type checking) followed by `vite build` to generate minified, chunked static assets in the `/dist` folder.

---

## PART 2: DESIGNATIONS, ROLES, AND RESPONSIBILITIES
A robust Role-Based Access Control (RBAC) system dictates what each user can see and do.

### 2.1 Management & Administrative Roles
#### 1. Super Administrator (System Owner)
*   **Scope:** Full system override.
*   **Responsibilities:** Can create/delete other management roles. Configures global settings (e.g., season years, default scoring rules). 
*   **Actions:** Access to System Audit Logs. Can bypass approval workflows in emergency scenarios (e.g., correcting historical data).

#### 2. Chief Statistician (Final Approver / Level 2)
*   **Scope:** Final authority on all cricket data entering the "Sphere" (the live database).
*   **Responsibilities:** Reviews aggregated match data, verifies statistical anomalies, and provides final sign-off.
*   **Actions:** Can **Approve (Publish)** or **Reject (Send back to Level 1/Scorer)** data. Cannot enter raw data themselves (separation of duties).

#### 3. Match Moderator / Referee (Level 1 Approver)
*   **Scope:** Tournament or match-specific authority.
*   **Responsibilities:** First line of defense for data accuracy. They compare the digital submission against physical scorecards.
*   **Actions:** Reviews drafts submitted by Scorers. Can **Approve (Escalate to Chief)**, **Edit directly**, or **Reject with Comments**.

#### 4. Scorer / Data Entry Operator
*   **Scope:** Match-day data input.
*   **Responsibilities:** Logging ball-by-ball actions, updating player rosters, logging fall of wickets, etc.
*   **Actions:** Can ONLY create data in **Draft** mode. Can save drafts, edit their own drafts, and trigger the "Submit for Approval" action.

#### 5. Team Manager
*   **Scope:** Team-specific administration.
*   **Responsibilities:** Managing their team's squad, submitting playing XI prior to matches.
*   **Actions:** Can submit roster drafts. Cannot edit match scores.

### 2.2 End-User / Player Roles
#### 6. Registered Player
*   **Scope:** Personal profile management.
*   **Responsibilities:** Keeping personal details (photo, bio) updated. 
*   **Actions:** Can view their own detailed analytics, request profile corrections, and track their position on the Stumps-Stats-Sphere leaderboards.

#### 7. Public / Guest User
*   **Scope:** Read-only access.
*   **Actions:** Can view "Published" matches, global leaderboards, and general statistics. Cannot see any data in "Draft" or "Pending" states.

---

## PART 3: THE APPROVAL STRUCTURE & WORKFLOW ENGINE
The core of the system is the **Data Integrity State Machine**. Any statistical entry (Match Scorecard, Player Record) goes through a strict lifecycle.

### 3.1 The State Machine (Status Flow)
1.  **`DRAFT`** $\rightarrow$ 2. **`PENDING_MODERATOR`** $\rightarrow$ 3. **`PENDING_CHIEF`** $\rightarrow$ 4. **`PUBLISHED`**

### 3.2 Detailed Step-by-Step Approval Process
*   **Stage 1: Initialization (Drafting)**
    *   *Actor:* Scorer.
    *   *Process:* The Scorer creates a new match instance. The system generates a Match ID with `status: DRAFT`. The Scorer enters innings data. Auto-save triggers every 30 seconds.
    *   *UI:* "Save Draft" button is active. "Submit" button is disabled until mandatory fields (e.g., both innings closed, overs match) are validated.
*   **Stage 2: Submission**
    *   *Actor:* Scorer.
    *   *Process:* Scorer clicks "Submit for Review". 
    *   *System Action:* Status updates to `PENDING_MODERATOR`. The record is locked for the Scorer (Read-Only). An in-app notification is sent to the assigned Match Moderator.
*   **Stage 3: Level 1 Review**
    *   *Actor:* Match Moderator.
    *   *Process:* Moderator accesses the "Approvals Inbox". They open the match card.
    *   *Actions Available:*
        *   **Approve:** Status changes to `PENDING_CHIEF`.
        *   **Reject:** Moderator types a mandatory reason in a modal dialog. Status reverts to `DRAFT`, notification sent to Scorer.
*   **Stage 4: Level 2 Review (Final)**
    *   *Actor:* Chief Statistician.
    *   *Process:* Chief views the queue of `PENDING_CHIEF` matches. 
    *   *Actions Available:*
        *   **Publish:** Status changes to `PUBLISHED`.
        *   **Reject:** Sent back to Moderator or Scorer.
*   **Stage 5: Data Integration**
    *   *System Action:* Once `PUBLISHED`, the system triggers background calculations. Runs, wickets, and averages are aggregated into the global "Sphere" (Leaderboards, Player Profiles). Only published data is fetched by public-facing UI components.

---

## PART 4: MODULES, SCOPE, AND FUNCTIONALITY
The codebase in `src/` is modularized into distinct business domains.

### 4.1 Authentication & Authorization Module
*   **Scope:** Handles login, session management, and role validation.
*   **Functionality:** 
    *   Validates JWT tokens.
    *   A High-Order Component (HOC) or Route Guard (`<ProtectedRoute role={["Admin", "Chief"]} />`) wraps pages to prevent unauthorized access.
    *   *Process:* Login $\rightarrow$ Fetch User Role $\rightarrow$ Populate Context $\rightarrow$ Render allowed navigation links.

### 4.2 Match Scoring Engine (The "Stumps" Module)
*   **Scope:** Real-time data entry for cricket matches.
*   **Functionality:**
    *   **Pre-match:** Toss selection, Playing XI confirmation.
    *   **Live Scoring:** Ball-by-ball UI grid. Buttons for runs (0-6), Extras (Wd, NB, B, LB), and Wickets.
    *   **Validation Logic:** Automatically switches strike on odd runs or over completion. Calculates run-rate automatically.

### 4.3 Approvals & Workflow Dashboard Module
*   **Scope:** Centralized hub for Moderators and Chiefs to clear data.
*   **Functionality:**
    *   Data tables built with `shadcn-ui` (using `@tanstack/react-table`).
    *   Filters: Sort by Date, Match Type, Status.
    *   Inline diff-viewer: Highlights what changed if a scorecard was edited after a rejection.

### 4.4 Statistics Aggregator (The "Sphere" Module)
*   **Scope:** Complex data visualization.
*   **Functionality:**
    *   Uses charting libraries (like Recharts/Chart.js) to display Player strike rates, Manhattan graphs, and Wagon Wheels.
    *   Calculates Derived Stats: Batting Averages, Economy Rates, Bowling Strike Rates (only aggregating `PUBLISHED` data).

---

## PART 5: PAGE-BY-PAGE UI/UX PROCESS AND STAGES

### 5.1 Dashboard Page (`/dashboard`)
*   **Who sees it:** All logged-in users, but widgets vary by role.
*   **How it works:** 
    *   *Scorer View:* Shows "My Drafts" and "Recently Rejected".
    *   *Moderator View:* Shows "Pending My Review" queue with a notification badge.
    *   *Chief View:* Shows "System Health", "Matches Awaiting Final Publish".
*   **Components used:** `Card`, `Badge` (for status colors: Draft=Gray, Pending=Yellow, Published=Green), `Skeleton` (for loading states).

### 5.2 Match Entry Page (`/matches/new`)
*   **Who sees it:** Scorer.
*   **Process:**
    1.  User selects teams from a dropdown (Combobox).
    2.  Fills out Toss details.
    3.  Enters the "Scoring Grid".
    4.  Bottom sticky bar contains the "Save Draft" and "Submit" buttons.
*   **State handling:** Uses `useReducer` or complex state objects to handle the complex ball-by-ball array locally before sending to the backend to prevent API spam.

### 5.3 Approval Inbox Page (`/approvals`)
*   **Who sees it:** Moderators, Chief Statistician.
*   **Process:**
    1.  Page loads a Paginated Table of submitted records.
    2.  User clicks a row to open an Accordion or Dialog Modal showing the match summary.
    3.  Action buttons: `<Button variant="destructive">Reject</Button>` and `<Button variant="default">Approve</Button>`.
    4.  Clicking action triggers a mutation (React Query `useMutation`), updates the DB, and optimistically removes the row from the table without a page reload.

### 5.4 Player Profile Page (`/player/:id`)
*   **Who sees it:** Everyone (Public & Logged in).
*   **Process:**
    1.  Extracts `id` from React Router parameters.
    2.  Fetches player bio and aggregates their `PUBLISHED` match history.
    3.  Renders a Tabs component (`shadcn-ui Tabs`):
        *   *Tab 1: Overview* (Career stats, photo).
        *   *Tab 2: Recent Form* (Last 5 matches bar chart).
        *   *Tab 3: Records* (Centuries, 5-wicket hauls).

### 5.5 System Settings Page (`/settings`)
*   **Who sees it:** Super Admin.
*   **Process:** 
    *   Manage Master Data (Add new venues, define tournament rules).
    *   Manage Users (Assign roles, revoke access). 

---

## PART 6: LOW-LEVEL CODE AND FILE ARCHITECTURE

Based on standard patterns for Vite/React/shadcn-ui apps in this repository:

*   **`/src/components/ui/`**: Contains all reusable, purely presentational `shadcn` components (buttons, dialogs, inputs, tables).
*   **`/src/components/shared/`**: Higher-level components composed of UI elements (e.g., `MatchCard.tsx`, `ApprovalStatusBadge.tsx`).
*   **`/src/pages/` or `/src/views/`**: Contains the route-level components (e.g., `Dashboard.tsx`, `ScoreEntry.tsx`). Each page is responsible for fetching its own data.
*   **`/src/lib/` or `/src/utils/`**: 
    *   `utils.ts`: Contains the Tailwind `cn()` utility class merger.
    *   `stats-engine.ts`: Pure functions for calculating strike rates, run rates. Easy to unit test via Vitest (`vitest.config.ts` is present).
*   **`/src/hooks/`**: Custom React hooks.
    *   `useAuth.ts`: Exposes `user`, `role`, and `logout()` functions.
    *   `useApprovals.ts`: Encapsulates the fetching and mutation logic for the approval workflow.
*   **`/src/types/`**: Extremely crucial for TS. Contains interfaces like `Match`, `Player`, `ApprovalLog`, ensuring the frontend knows exactly what shape of data to expect.

### 6.1 Database / Payload Structure (Hypothetical JSON)
When a Scorer submits a match, the payload looks like this:
```json
{
  "match_id": "m_12345",
  "tournament_id": "t_2026",
  "status": "PENDING_MODERATOR",
  "submitted_by": "user_789", // Scorer ID
  "data": {
     "team_a_score": 185,
     "team_b_score": 180
  },
  "approval_logs":[
     {
       "action": "SUBMITTED",
       "actor_id": "user_789",
       "timestamp": "2026-03-21T07:00:00Z"
     }
  ]
}
```

---

## PART 7: SECURITY & DATA INTEGRITY
1.  **Immutability of Published Data:** Once a state reaches `PUBLISHED`, the UI removes all "Edit" buttons. If a correction is needed, an Admin must trigger a `REVERT_TO_DRAFT` override, which logs a severe audit trail.
2.  **Optimistic UI with Rollback:** When an Approver clicks "Approve", the UI immediately reflects success. If the backend fails (e.g., network error), `React Query` automatically rolls the UI back to the previous state and shows an error toast (`shadcn-ui Toaster`).
3.  **Strict Typing:** `vitest.config.ts` and `eslint.config.js` ensure that no code with broken types or unused variables is pushed, maintaining enterprise-grade reliability for statistics processing.

*This architectural blueprint covers the full spectrum of the Stumps-Stats-Sphere project, ensuring a flawless handover for development, scaling, and operational management.*

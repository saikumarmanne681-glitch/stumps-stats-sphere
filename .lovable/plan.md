

# Cricket Club Portal — Implementation Plan

## Overview
A cricket club management portal using Google Sheets as the backend database, with public homepage, admin panel, and player dashboards.

## Google Sheets Integration
We'll use the Google Sheets API (public sheets, no auth needed) via a published CSV/JSON approach. Each sheet tab becomes a "table":

**Sheet Tabs (Data Model):**
- **Players** — player_id, name, username, password, phone, role (batsman/bowler/allrounder), status
- **Tournaments** — tournament_id, name, format, overs, description
- **Seasons** — season_id, tournament_id, year, start_date, end_date, status
- **Matches** — match_id, season_id, tournament_id, date, team_a, team_b, venue, status, toss_winner, toss_decision, result, man_of_match
- **BattingScorecard** — id, match_id, player_id, team, runs, balls, fours, sixes, strike_rate, how_out, bowler_id
- **BowlingScorecard** — id, match_id, player_id, team, overs, maidens, runs_conceded, wickets, economy, extras
- **Announcements** — id, title, message, date, active (true/false), created_by
- **Messages** — id, from_id, to_id, subject, body, date, read, reply_to

Since Google Sheets has limitations for writes from client-side, we'll use the **Google Apps Script Web App** as a REST API proxy — a small Apps Script deployed as a web app that accepts GET/POST requests and reads/writes to the sheet. The user will need to:
1. Create a Google Sheet with the tabs above
2. Deploy a provided Apps Script as a web app (we'll provide the script)
3. Paste the web app URL into the portal config

## Authentication
- **Admin**: Hardcoded username "admin", password "9908" — stored in app, validated client-side
- **Players**: Login with username/password stored in the Players sheet
- Sessions stored in localStorage (simple token approach)

> **Security note**: This is NOT production-secure. Credentials are visible in the sheet and client code. Acceptable for a club-level internal tool.

## Pages & Features

### 1. Public Homepage (`/`)
- Scrolling announcement ticker bar at top (active announcements ordered by date)
- Tournament leaderboard cards (top teams/players by runs, wickets, wins)
- Player rankings table (filterable by tournament)
- Latest matches section with date, teams, result, and match ID

### 2. Admin Dashboard (`/admin`)
- Protected by admin login
- **Announcements**: Add/edit/delete, toggle active status
- **Tournaments**: Create tournament (once), view all
- **Seasons**: Add season under a tournament (year-wise)
- **Players**: Add/edit/delete player accounts
- **Matches**: Create match, assign teams, enter full scorecard (batting + bowling for each player/team)
- **Messages**: Send notifications to individual or all players
- All forms with validation, auto-generated IDs (e.g., `M001`, `T001`, `P001`)

### 3. Player Dashboard (`/player`)
- Protected by player login
- Profile card with career stats summary
- Career statistics with filters (by tournament, season, year)
- Batting stats: matches, innings, runs, average, strike rate, 50s, 100s, highest score
- Bowling stats: overs, wickets, average, economy, best figures
- Match history table
- Messages inbox with read/reply functionality

### 4. Login Page (`/login`)
- Toggle between Admin and Player login
- Route to appropriate dashboard

## Auto-Calculations
All stats computed on the client from raw scorecard data:
- Batting average = runs / dismissals
- Strike rate = (runs / balls) × 100
- Bowling economy = runs_conceded / overs
- Bowling average = runs_conceded / wickets
- Team totals, match results, leaderboard rankings — all derived

## Technical Architecture

```text
┌─────────────┐     fetch JSON      ┌──────────────────┐
│  React App  │ ◄──────────────────► │ Google Apps Script│
│  (Vite/TS)  │     POST writes     │   (Web App API)  │
└─────────────┘                     └────────┬─────────┘
                                             │ read/write
                                    ┌────────▼─────────┐
                                    │  Google Sheet     │
                                    │  (8 tabs/tables)  │
                                    └──────────────────┘
```

**Key files to create:**
- `src/lib/googleSheets.ts` — API client for the Apps Script web app
- `src/lib/auth.ts` — simple auth context
- `src/lib/calculations.ts` — all stat calculation utilities
- `src/pages/Home.tsx`, `Login.tsx`, `AdminDashboard.tsx`, `PlayerDashboard.tsx`
- `src/components/` — AnnouncementTicker, Leaderboard, MatchCard, Scorecard, StatsTable, MessagePanel, etc.
- Google Apps Script code (provided as a copyable script)

## Implementation Order
1. Set up Google Sheets data layer + Apps Script API proxy
2. Auth system (admin + player login)
3. Public homepage with announcements, leaderboards, latest matches
4. Admin dashboard — CRUD for tournaments, seasons, players, matches, scorecards, announcements
5. Player dashboard — profile, career stats with filters, match history
6. Messaging system
7. Auto-calculations and data aggregation throughout


# Architecture Data Flow (Quick View)

This page gives a fast, implementation-oriented view of how data moves across the app.

## 1) App topology
```mermaid
flowchart TD
  U[User Browser] --> R[React App (src/pages + src/components)]
  R --> C[Context + Query Layer (src/lib/DataContext.tsx)]
  C --> V1[v1 API client (src/lib/googleSheets.ts)]
  C --> V2[v2 API client (src/lib/v2api.ts)]
  V1 --> GAS[Google Apps Script Web App]
  V2 --> GAS
  GAS --> GS[(Google Sheets Tabs)]
```

## 2) Auth and route protection flow
```mermaid
sequenceDiagram
  participant User
  participant Login as Login Page
  participant Auth as AuthProvider (src/lib/auth.tsx)
  participant API as Sheets/API
  participant Guard as RequireAuth

  User->>Login: submit username/password + role
  Login->>Auth: login(...)
  alt admin
    Auth->>Auth: validate local admin credentials
  else player
    Auth->>API: getPlayers()
  else management
    Auth->>API: getManagementUsers()
  end
  Auth-->>User: persist cricketUser in localStorage
  User->>Guard: navigate protected route
  Guard-->>User: allow or redirect /login
```

## 3) Match/stat data flow
```mermaid
flowchart LR
  A[src/pages/*] --> B[src/lib/DataContext.tsx]
  B --> C[src/lib/googleSheets.ts]
  B --> D[src/lib/v2api.ts]
  C --> E[Apps Script actions]
  D --> E
  E --> F[(Sheets: Players/Matches/Scorecards/...)]
  F --> E --> C --> B --> A
```

## 4) Ops pointers
- Keep Sheets headers/tabs synced before enabling new frontend features.
- Keep Apps Script deployment version current after backend script changes.
- Validate auth + read/write + email flows after each deployment.

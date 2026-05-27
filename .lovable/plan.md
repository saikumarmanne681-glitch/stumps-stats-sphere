
# Major Update Catalog — Pick by Number

Below is a numbered menu of upgrades. Reply with the numbers you want (e.g. "Build 3, 7, 12, 24") and I'll plan + build only those.

---

## A. Critical Fixes & Stability (1–15)

1. Fix Docs Portal end-to-end (uploads, previews, permissions, empty-state, mobile layout)
2. Fix Scorelist approval realtime (no polling — switch to event-driven refresh + optimistic UI)
3. Fix Certificate generation overlaps (text/image/QR collision detector before save)
4. Fix mobile responsiveness across all preview surfaces (Match Center, Scorelist, Certificates, Docs, News)
5. Fix IST date drift in standings, audit logs, certificate dates
6. Fix Service Worker stale cache (force update banner + skipWaiting)
7. Fix login race conditions (admin/player/management/team) + session expiry banner
8. Fix Apps Script timeout on large reads (pagination + ETag caching)
9. Fix double-submit on every mutation (idempotency tokens)
10. Fix presence flicker (online/away/offline) with smoother thresholds
11. Fix Newsroom ticker overlap on small screens
12. Fix Leaderboard sort stability + tie-breakers
13. Fix Match Center undo/redo edge cases (over rollover, retired hurt)
14. Fix scorecard import OCR mis-mapping for team abbreviations
15. Fix broken external image fallbacks (player/team avatars)

## B. Certificates (16–30)

16. 10 new premium certificate templates (Royal Gold, Minimal Mono, Cricket Stadium, Neon Sport, Vintage Press, Glassmorphism, Hologram, Art Deco, Heritage Crest, Championship Foil)
17. Certificate approval chain: Media Manager → Secretary → Treasurer → President/VP
18. Approval roadmap visualization with stage badges + ETA
19. Bulk certificate generation (whole tournament / whole team in one click)
20. Certificate revocation + reissue with audit trail
21. QR-verifiable certificates with public verify page redesign
22. Player/Team dashboard "Pending vs Approved" certificate tabs
23. Email delivery only after final approval (with branded template)
24. Anti-forgery: per-certificate signed hash + watermark
25. Admin template designer (drag-drop fields on SVG)
26. Auto-fill performance stats per certificate type
27. Print-safe A4/Letter export with bleed marks
28. Multi-language certificate support (EN + regional)
29. Certificate analytics (issued, pending, approval lead-time)
30. Achievement-based auto-suggested certificates (man of match, hat-trick, century)

## C. Scorelists & Scoring (31–42)

31. Inline approve/reject for management on dashboard cards
32. Scorelist diff viewer (before vs after edit)
33. Live "currently scoring" indicator on home page
34. Ball-by-ball commentary auto-generated
35. Wagon wheel + pitch map per batter
36. Partnership tracker live
37. Powerplay / Death-over splits
38. Predictive score (run-rate based)
39. Scorelist PDF export with team logos
40. Scorer assignment + handoff workflow
41. Match review queue with SLA timers
42. Voice-input ball entry (mobile scorer)

## D. Player & Team Experience (43–55)

43. Player profile redesign (hero stat card, career arc chart)
44. Career milestones timeline (50s, 100s, 5-wickets)
45. Head-to-head player comparison tool
46. Team profile pages with squad, history, trophies
47. Team dashboard for captains (squad availability, fitness notes)
48. Player availability toggle per match
49. Injury & fitness log (private to player + management)
50. Player-of-the-tournament auto-calculator
51. Personal best alerts + share card
52. Player media gallery (photos, video links)
53. Endorsement / sponsor field on profile
54. Social share cards (auto-generated PNG for milestones)
55. Player-to-player private DMs (extends current messaging)

## E. Tournaments & Seasons (56–66)

56. Bracket visualizer for knockouts
57. Group-stage points table live widget
58. Tournament home page with hero, schedule, standings, top performers
59. Multi-season comparison dashboard
60. Season archive with downloadable record book PDF
61. Fixture auto-generator (round-robin, double round-robin, knockout)
62. Venue/ground management module
63. Umpire & referee roster
64. Toss recorder with auto-broadcast
65. Awards night module (nominees, voting, results)
66. Sponsorship slots per tournament (logos, mentions)

## F. Management & Governance (67–76)

67. Management dashboard redesign (KPIs, pending actions, SLA)
68. Board elections module (nominations, votes, results)
69. Meeting minutes repository
70. Department budgets + expense logs
71. Designation-based permission matrix (visual editor)
72. Broadcast notice composer with audience targeting
73. Audit log explorer with filters + CSV export
74. Two-person rule for sensitive ops (delete season, lock match)
75. Management heatmap (who's approving what, throughput)
76. Internal task board (kanban per department)

## G. Communication & Engagement (77–86)

77. Push notifications (browser + PWA)
78. Email digest (weekly highlights)
79. WhatsApp deep-link share for fixtures/results
80. In-app announcement modal scheduler
81. Comments on news posts
82. Polls & predictions (man of the match guess)
83. Fan reactions (emoji) on live matches
84. Birthday & anniversary auto-greetings
85. Newsletter signup + archive
86. RSS feed for news

## H. Public-facing Site (87–95)

87. New marketing landing page with hero animation
88. SEO overhaul (meta, OG tags, sitemap, JSON-LD)
89. Public stats explorer (filter by season/team/player)
90. Hall of Glory redesign with 3D trophy gallery
91. Public schedule with calendar/list/map toggle
92. Live-match public watch page (read-only ticker)
93. About / Contact / Sponsors pages
94. Verification page redesign (cleaner QR landing)
95. Multi-theme toggle (light/dark/stadium)

## I. Data, Search, Performance (96–105)

96. Global command palette (Cmd/Ctrl-K) with deep search
97. Full-text search across players, matches, news, docs
98. Offline-first read mode (cache standings/last 5 matches)
99. Image CDN + lazy-load all avatars
100. Bundle-size audit & code-splitting per route
101. TanStack Query devtools gated behind admin
102. Apps Script response compression (gzip JSON)
103. Background sync queue for offline mutations
104. Snapshot backups (daily ZIP to admin email)
105. Data integrity dashboard (orphans, duplicates, mismatches)

## J. Security & Compliance (106–113)

106. Email OTP hardening + rate-limit
107. Login attempt lockout + IP log
108. Session device manager (revoke sessions)
109. Password change & recovery flow for all roles
110. Role-based audit trail on every write
111. Privacy policy + terms pages
112. Export-my-data (GDPR-style) for players
113. Admin 2FA (TOTP)

## K. Mobile & PWA (114–120)

114. Install-as-app banner
115. Mobile bottom-nav for primary routes
116. Pull-to-refresh on lists
117. Haptic feedback on key actions
118. Dark-mode tuned for OLED
119. Offline indicator with retry
120. Native share sheet integration

## L. AI / Smart Features (121–128)

121. AI match summary auto-write (post-match)
122. AI commentary generator (toggle on live page)
123. AI player Q&A ("how did I perform vs Team X?")
124. Smart highlight reel suggester (key overs)
125. AI-assisted news article drafting for media manager
126. Anomaly detection (suspicious score edits)
127. Form-builder AI assist (describe → fields)
128. Translation assistant for announcements

## M. Admin Power Tools (129–135)

129. One-click "rebuild standings" recompute
130. Schema validator (Sheets vs frontend types)
131. Apps Script health monitor + alert
132. Test-data seeder UI (refresh demo data safely)
133. Feature flags panel (toggle modules on/off)
134. Maintenance mode banner + scheduled windows
135. Cross-environment data copier (dev ↔ prod, guarded)

---

## How to respond

Reply with the numbers you want, e.g.:
> Build 1, 4, 16, 17, 22, 67, 96, 121

You can also say "all of section B" or "everything in A + C". I'll then create a focused implementation plan per batch (small batches ship faster + safer than mega-PRs).

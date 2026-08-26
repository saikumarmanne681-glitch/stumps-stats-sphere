# Next Update Catalog — pick by number

Numbered options across fixes, improvements and new features. Tell me the numbers you want and I'll build only those.

## A. Bug fixes / reliability

1. Legacy matches with summary-only scores: add an admin "backfill scorecard" flow so old matches get real batting/bowling rows.
2. Audit log coverage sweep: log every admin/management write (match save, scorelist stage change, certificate certify, board edits), not just auth.
3. Date/IST audit across every date input and display (schedules, seasons, certificates) with a single shared date helper.
4. Offline/failed-write recovery: queue failed Apps Script writes and retry with a visible "unsaved changes" indicator.
5. Duplicate-row guard in Sheets writes (idempotency keys) to stop double-submits creating duplicates.
6. Verification hardening: single verify path shared by scorelists and certificates, with clear reasons when a document fails.
7. Error boundaries per route so one crashed panel no longer blanks the whole page.

## B. Performance

8. Split the largest pages (AdminScorelistsPage ~1100 lines, DocumentsPortalPage ~960) into lazy sub-panels.
9. Cache-first data layer: persist TanStack Query cache to storage so returning users see instant data.
10. Batch Apps Script reads into one combined "bootstrap" call instead of many sequential fetches.
11. Virtualised long tables (players, matches, audit events) for smooth scrolling on mobile.
12. Image/SVG and font loading optimisation plus route prefetch on hover.

## C. UI / UX polish

13. Finish the Emerald Prestige pass on remaining admin panels (Ops Center, Work Queue, Backups, Sheets Console).
14. Mobile-first table→card conversion everywhere under 768px.
15. Empty, loading and error states standardised with one shared component set.
16. Dashboard redesign for players: hero stat tiles, form graph, milestone chips.
17. Command palette upgrade: recent items, quick actions, keyboard hints.
18. Print/PDF style pass so every exportable doc (scorelist, certificate, forms) prints identically.

## D. Cricket features

19. Head-to-head page: any two players or teams compared across seasons.
20. Player form and trend charts (last 5/10 innings, rolling average, strike rate).
21. Milestones and badges engine (50s, 100s, 5-wicket hauls, hat-tricks) shown on profiles.
22. Fantasy-style points and season MVP race table.
23. Live match commentary feed with over-by-over summary.
24. Team squad management with roles, captains, and availability per match.
25. Season awards auto-computation (best batter, bowler, fielder, emerging player).
26. Playoff/bracket visualiser for knockout stages.
27. Venue and toss analytics (win % by venue, batting first vs chasing).

## E. Certificates & documents

28. Ten-plus certificate templates with a template gallery and per-tournament default.
29. Full certificate approval chain (referee → director → official) mirroring the scorelist stages.
30. Bulk certificate generation for a whole season or team in one action.
31. Certificate wall on player/team dashboards with share links.
32. Documents portal rework: folders, tags, search, version history, access by role.
33. Digital signature capture (draw/upload) reused across scorelists and certificates.

## F. Communication & engagement

34. In-app notification centre with unread counts and per-type preferences.
35. Email digest: weekly stats and fixtures to players.
36. Push notifications (PWA) for match start, result and approvals.
37. Comments/reactions on news posts.
38. Announcement scheduling with start/end dates.

## G. Admin & governance

39. Role-based permissions matrix editor instead of hardcoded checks.
40. Approval work queue v2: SLA timers, assignment, escalation.
41. Data health dashboard: missing scorecards, unlinked players, orphan rows.
42. One-click season rollover (clone structure, carry teams forward).
43. Scheduled backups with restore preview and diff.

## H. AI-assisted (Lovable AI Gateway)

44. Auto match-report writer from a scorecard.
45. Scorecard PDF/image intake that extracts rows automatically.
46. Natural-language stats search ("who scored most fours in 2025 finals?").
47. Smart insights on player pages (strengths, weaknesses, matchup notes).

## Technical notes

Everything stays on the current stack: React + Vite + TypeScript, Google Sheets via Apps Script, TanStack Query, Emerald Prestige tokens in `src/index.css`. AI items (44–47) would use the Lovable AI Gateway. Push notifications (36) need the existing service worker extended. No dark or black surfaces anywhere.

# Cricket-Themed 404 Page + Next Enhancements

## 1. Redesigned 404 page (`src/pages/NotFound.tsx`)

A light, premium, cricket-themed "not found" screen — ivory/emerald/gold only, no dark or black surfaces.

- **Hero panel:** glass/gradient-surface card centred on the ivory page background, soft emerald and gold blur orbs, dot-grid texture, gold hairline divider.
- **Headline:** oversized display "404" with a gold gradient text fill, plus a cricket line — "Caught behind! This page is out." with a short supporting sentence.
- **Cricket motif:** animated stumps + ball graphic built from the existing tokens (SVG, gentle float / spin-slow animation, honours `prefers-reduced-motion`).
- **Actions:** primary "Back to Home", secondary "Go Back", plus quick links to Leaderboards, Schedules, News Room and Documents as chip-style cards.
- **Attempted path** shown in a muted mono pill so users see what they typed.
- **Responsive:** single-column stacked on 375px mobile, two-column quick-link grid on iPad, wide layout on desktop; all text scales via responsive type classes.
- **SEO/a11y:** single H1, `noindex` meta on this route, descriptive link labels; keeps the existing console error log.

No new dependencies; only design-token classes.

## 2. Suggested enhancements (pick by number)

**Quick wins**
1. Global search "jump to" (players, matches, tournaments) wired into the existing command palette.
2. Offline/empty-state illustrations reused from the 404 motif across pages that currently show plain text.
3. Skeleton loaders that mirror real layout on Home, Leaderboards and Match pages instead of spinners.
4. Toast + inline retry on any failed Sheets write (currently silent in places).

**Cricket features**
5. Player comparison view — pick two players, side-by-side batting/bowling/season splits.
6. Head-to-head team record page (matches, win %, NRR, best performances).
7. "Form guide" — last 5 results strip per team on standings rows.
8. Match win-probability / momentum chart from ball-by-ball data where available.
9. Milestone tracker — alerts when a player nears 500 runs, 50 wickets, etc.

**Certificates & docs**
10. Bulk certificate generation for a whole team or a tournament's award list.
11. Certificate share card (portrait image export for WhatsApp/Instagram).
12. Document expiry reminders with email notice via the existing mailer.

**Admin & ops**
13. Admin analytics tile row: entries this week, pending approvals ageing, top contributors.
14. Approval SLA badges (green/amber/red by hours pending) in the work queue.
15. Audit log filters by actor, action type and date range with CSV export.

**Experience**
16. Installable PWA polish — proper icons, offline home page, "Add to home screen" prompt.
17. Season-wise landing switcher so returning users open their preferred season.
18. Keyboard shortcuts overlay (`?`) listing palette and navigation keys.

Tell me which numbers you want and I'll build them after the 404 page.

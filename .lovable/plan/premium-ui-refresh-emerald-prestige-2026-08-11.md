# Premium UI Refresh — Emerald Prestige

A full visual upgrade of Stumps Stats Sphere: one light, premium design language (emerald green + gold on ivory, no black/dark surfaces), new typography, richer buttons/chips/cards, next-gen loading graphics, and layered motion — applied across public pages and the admin/management side, fully responsive on mobile, tablet and desktop.

## The look

- **Palette (light only):** ivory page background `#f7faf7`, soft green surfaces `#e6f0e8`, emerald primary `#1f8a5c`, gold accent `#c9a84c`. Deepest ink used for text is a dark green-slate, never black.
- **Typography:** Sora for headings/display, Manrope for body. Replaces Oswald + Source Sans across the app.
- **Surfaces:** frosted glass panels, soft ivory-to-mint gradients, layered emerald-tinted shadows, generous rounded corners (16–28px), gold hairline separators on premium/hero elements.
- **Motion (level 4 of 5):** entrance fades/rises on sections, staggered card reveals, hover lift on cards and rows, gold shimmer sweep on primary CTAs, animated number counters on stats, spring-y active press, animated skeleton shimmer. All motion honours `prefers-reduced-motion`.

## What changes

### 1. Design system foundation
- Rewrite the color tokens in `index.css` to the Emerald Prestige scale (light + a light-tinted "dark" mode that stays bright, so no black ever appears).
- Add gradient, glow, shadow, and glass tokens: `--gradient-hero`, `--gradient-gold`, `--gradient-surface`, `--shadow-soft/elevated/glow`, `--ring-gold`.
- Load Sora + Manrope, update `tailwind.config.ts` font families, radius scale, new keyframes (rise-in, stagger-in, shimmer, gold-sweep, float, count-pop, pulse-ring) and matching animation utilities.
- New shared utility classes: `.premium-card`, `.glass-panel` (refreshed), `.stat-tile`, `.gold-divider`, `.section-shell`, `.chip`.

### 2. Core components
- **Button:** new variants — `premium` (emerald gradient + gold sweep on hover), `gold`, `soft` (tinted surface), `glass`, plus refined default/outline/ghost with lift + spring press. Sizes gain an `xs` and touch-friendly heights on mobile.
- **Badge/Chip:** new `gold`, `soft`, `success`, `warning`, `info`, `live` (pulsing dot) variants; consistent pill sizing and icon slot.
- **Card / Table / Tabs / Dialog / Select / Input:** rounded, tinted borders, hover states, focus rings in emerald/gold; dialogs and sheets become full-height scrollable on mobile.
- **Loading graphics (`LoadingOverlay.tsx`):** replace with a next-gen set — an animated cricket-ball/orbit loader, shimmering skeletons that mirror real layout, a slim top route-progress bar, and inline button spinners.

### 3. Global chrome
- **Navbar:** glass sticky header, gold underline active indicator, compact scroll-shrink, cleanly aligned overflow menu on desktop and a full-screen animated drawer on mobile/iPad.
- **PageHeader:** hero band with gradient + logo lockup, responsive title scale, department chip row.
- **Footer & tickers:** refreshed gradient ticker and announcement box matching the new tokens.

### 4. Public pages
Home (hero, leaderboards, matches grid, horizontal scroller), Leaderboards, Seasons Overview, Schedules, Match/Tournament/Player pages, News Room, Documents & Forms portals, Verification pages, Login — restyled onto the new shells, stat tiles, chips and motion. Grid breakpoints audited for 375px / 768px / 1024px / 1440px.

### 5. Admin & management
Admin Dashboard, Ops Center, Work Queue, Matches & Scorecards, Scorelists, Certificates queue/builder, Management Board, Department dashboards, Presence/Audit panels — same tokens, premium cards, sticky section headers, tables that switch to stacked cards under 768px, consistent toolbars and action chips.

### 6. Cleanup
Replace the hardcoded `text-white` / `bg-white` / `bg-black` style utilities found in ~14 component files with semantic tokens so theming stays consistent.

## Out of scope
No changes to data fetching, Apps Script, certificate PDF export logic, approval rules, or any business logic — this pass is presentation only. Certificate PDF/print styling is left as-is unless the token swap requires a color fix.

## Technical notes
- Tokens live in `src/index.css` as HSL; Tailwind reads them via `tailwind.config.ts`. Components consume semantic classes only.
- Animations are CSS keyframes + Tailwind utilities (no new animation library), keeping bundle size and load time unchanged.
- Work order: tokens/config → core UI primitives → chrome (Navbar/PageHeader/loaders) → public pages → admin/management → responsive sweep at four breakpoints with screenshots.

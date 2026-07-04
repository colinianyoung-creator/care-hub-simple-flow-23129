# Homepage Redesign — Streaming-Style Bento

Rework the marketing homepage (`src/pages/Landing.tsx` and its `landing/` components) into a cleaner, more modern layout inspired by streaming browse UIs, matching the approved **Cinematic bento interface** direction. Cloud White palette, Outfit headings + Figtree body, bento grid. No app functionality changes — this is presentation only.

## What changes

### 1. Fonts (Outfit + Figtree)
- Install `@fontsource/outfit` and `@fontsource/figtree`, import weights in `src/main.tsx`.
- Add `heading` (Outfit) and `sans`/`body` (Figtree) to `tailwind.config.ts` `fontFamily`, and set Figtree as the default body font.
- Headings use `font-heading`; body text inherits Figtree. No hardcoded Google Fonts links.

### 2. Hero (streaming banner)
Replace `HeroSection.tsx` with a single rounded "hero panel":
- Soft `#e8ecf1` panel with a subtle blue radial glow in the top-right corner.
- A small "Live" style pill + eyebrow label, oversized Outfit headline (`CareHub` on line 1, accent-blue phrase on line 2), concise subcopy.
- Two CTAs wired to real routes: primary dark "Start Exploring" (play-icon) → `/auth`, secondary "Sign In" → `/auth`.
- Fully responsive: scales headline down on mobile, stacks CTAs.

### 3. Feature section (bento grid)
Replace the uniform 3-column `FeatureCard` grid with a mixed-size bento grid that keeps the **existing live mini-demos** (they already convey the real features):
- Large featured tile: **Shift Scheduling** (uses `ScheduleDemo`) — 2x2.
- Wide tile: **Medication / MAR** (`MARDemo`).
- Medium tiles for **Body Map** (`BodyMapDemo`), **Notes & Tasks** (`NotesDemo`).
- Small tiles for **Timesheet Export** (`ExportDemo`) and **AI Care Reports** (`AIReportDemo`), one styled as the blue accent tile.
- Each tile: rounded-[32px], subtle border/shadow, hover lift/scale, staggered fade-in. `FeatureCard.tsx` is updated (or a new `BentoTile`) to support variable spans and the new visual style via tokens.

### 4. Simplify the rest
- Keep **How It Works**, **RoleBenefits**, **Security & Privacy**, **Final CTA**, and **Footer**, but restyle spacing/typography to match (Outfit headings, lighter surfaces, rounded cards) so the page reads as one cohesive modern design.
- Tighten copy and reduce visual noise to keep the "simple" feel.

### 5. Design tokens
- Ensure the Cloud White values map to existing semantic tokens in `index.css` (background `#fafbfc`, muted surface `#e8ecf1`, muted-foreground `#94a3b8`, primary blue `#3b82f6`). Use tokens/utilities — no ad-hoc hex in components beyond what maps cleanly to tokens.

## Out of scope
- No changes to auth, dashboard, or any backend/data logic.
- Feature demo components keep their current behavior; only their framing/layout changes.

## Technical notes
- Files touched: `src/main.tsx`, `tailwind.config.ts`, `src/index.css` (token check), `src/pages/Landing.tsx`, `src/components/landing/HeroSection.tsx`, `src/components/landing/FeatureCard.tsx` (+ possibly a new `BentoTile.tsx`), light restyle of `RoleBenefits.tsx`.
- Verify with a Playwright screenshot at desktop and mobile widths after building.

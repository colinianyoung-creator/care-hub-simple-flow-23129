## Goal
Make the homepage copy more inclusive and generic: caring for disabled children, disabled adults, or non-disabled elderly loved ones. Update the hero subtitle to exactly "Manage your care, simple".

## What we'll change

### 1. Hero section (`src/components/landing/HeroSection.tsx`)
- Subtitle: set to "Manage your care, simple".
- Body copy: change from "Built for disabled people, families, and carers" to language that covers disabled children, disabled adults, and non-disabled elderly loved ones (e.g., "Built for families and carers supporting disabled children, disabled adults, or elderly loved ones").
- Keep CTAs and visual styling unchanged.

### 2. Feature intro (`src/pages/Landing.tsx`)
- Update the section headline and paragraph so it doesn't assume only one care scenario.
- Maintain the streaming/bento tone.

### 3. How it works, security, and final CTA sections (`src/pages/Landing.tsx`)
- Replace any remaining "home care" / "disabled people" phrasing with inclusive, generic care language.
- Keep the existing rounded, Cloud White, cinematic bento visual direction.

## Out of scope
- No design direction changes; no new components, animations, or color changes.
- No auth, backend, or app functionality changes.

## Files to edit
- `src/components/landing/HeroSection.tsx`
- `src/pages/Landing.tsx`

## Verification
- Build/typecheck after edits to ensure no JSX issues.
- Spot-check the preview to confirm the subtitle and updated copy render correctly.
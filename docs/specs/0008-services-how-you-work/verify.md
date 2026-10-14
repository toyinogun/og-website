# Verify: services & how you work · spec 0008 · updated 2026-10-14
_Steps derived from spec 0008 acceptance criteria. `/check verify` ran these on the built site (`npm run build`, `astro preview`, Playwright)._
## UI / manual
- [x] Open `/services` at 1280, 375 (light and dark), 640 and 639 → one h1, intro with button, five offers, five numbered steps, two pricing models and note, closing button; no sideways scroll → AC-1, AC-5 to AC-8, AC-11
- [x] Header at 640 shows five links on one row, at 639 on two rows (so the `sm` layout holds, no `md` fallback needed) → AC-9
- [x] Services is the only current link on `/services` → AC-9
- [x] Below 640 both buttons fill the width (335 of 375, 599 of 639), from 640 they are natural width (214) → AC-11
- [x] Click a "Seen in" link → opens the project page → AC-5
- [x] Mark Mool as a draft, build → `dist/services` has no "Mool"; change reverted and rebuilt → AC-14
## Commands
- [x] `npm test` → 906 pass (limits, vocabulary coverage, `offerProof`, `OfferList`, page, style guide) → AC-2 to AC-5, AC-15
- [x] `npm run build && npm run test:build` → 175 pass (head tags, canonical, sitemap, proof titles, no figures, two scripts, no img) → AC-4, AC-7, AC-10, AC-13, AC-14
- [x] `npx playwright test` → 271 pass, 17 skipped by design (axe both themes, target sizes, width sweep, keyboard order, services spec) → AC-9, AC-11, AC-12, AC-13
- [x] Outside requests while loading `/services` → only the local host → AC-13
## Acceptance-criteria coverage
- AC-1 to AC-15 · all met with the evidence above · AC-15 `design.md` rows and style guide section added

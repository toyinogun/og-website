# Verify: work listing · spec 0005 · updated 2026-10-14
_Steps derived from spec 0005 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] Load `/projects` from the production build (`npm run build`, then `npx astro preview`) → inside `<main>` the first thing is the intro: the one h1 "Work" at inner page size and the lead; no eyebrow, no button → AC-1
- [x] Read `src/lib/work.ts` against the page → every word (title, description, heading, lead, closing heading and text) comes from `WORK` → AC-2
- [x] Four cards in this order: Production Kubernetes on Hetzner Cloud, Deployer, ShipSafe, Mool; each title is an h2 → AC-3
- [x] Run the `WorkList` empty test → one line "Write ups are on their way.", no list, no button → AC-4
- [x] The closing section is last in `<main>`: "Want something like this built?", the text, then "Message me on LinkedIn"; it is the only contact link in `<main>` → AC-5
- [x] Each card shows chips between the outcome and the link; the Hetzner card shows Kubernetes, Talos Linux, Terraform, Hetzner Cloud, Argo CD and nothing more; ShipSafe shows Go, Docker; Tab never stops on a chip → AC-6, AC-7
- [x] On `/` the cards show no chips → AC-6
- [x] Chips are small muted text in a thin outline with rounded corners, no fill, in both themes; on `/styleguide` (dev server) the card with chips and `WorkList` filled and empty appear; `design.md` lists Tag chip and Work list → AC-8
- [x] Header shows Home and Work; Work is current on `/projects`, Home on `/`, neither on `/no-such-page`; Tab order is skip link, wordmark, Home, Work, toggle; two header rows at 639 pixels, one at 640 → AC-9
- [x] After deploy: `curl -sI https://toyintest.org/projects` → 200, no `location`; `curl -sI https://toyintest.org/projects/` → a 3xx (307) with `location: /projects`; `/` → 200; `/no-such-page` → 404; paste the output as a comment on the ship issue → AC-10 (passed 2026-10-14 on JSM-31: 200, 307 to `/projects`, 200, 404)
- [x] The tab title is "Work by Toyin Ogunseinde, DevOps engineer"; the meta description, canonical (`https://toyintest.org/projects`) and share tags match → AC-10, AC-11
- [x] Sweep 320, 360, 375, 639, 640, 768, 1024, 1440 pixels → no sideways scroll; one card per row below 768, two from 768, three from 1024; chips wrap inside their card; the closing button fills the width below 640 → AC-12
- [x] Headings go h1, h2 per card, closing h2; axe WCAG 2.2 AA finds nothing in light and dark; every link and button is at least 24 by 24 pixels → AC-13
- [x] Load `/projects` and scroll to the bottom → every request goes to the site itself; the page holds only the theme and toggle scripts → AC-14

## Commands
- [x] `npm test` → passes, including `stack-contract.test.ts` (`trailingSlash` and `html_handling` locked), `work.test.ts`, `projects.test.ts` (`cardStackLabels`), `site.test.ts`, the `WorkList` and `ProjectCard` component tests, `tests/work-page.test.ts` → AC-2, AC-4, AC-5, AC-6, AC-7, AC-9
- [x] `npm run build && npm run test:build` → `work-build.test.ts` and the spec 0003 nav build test pass → AC-3, AC-6, AC-10, AC-11, AC-14
- [x] `npm run test:e2e` → `work.spec.ts`, `home.spec.ts` and `design-system.spec.ts` pass at desktop and mobile widths → AC-9, AC-12, AC-13, AC-14

## Value sourcing
- [x] Change one project's `order` locally and rebuild → the cards follow it (revert after) → AC-3
- [x] Move a stack key to the front of the Hetzner write up locally → it becomes the first chip and the fifth drops off (revert after) → AC-7
- [x] Set `draft: true` on one write up locally → it shows on the dev server, not in the production build (revert after) → AC-3

## Acceptance-criteria coverage
- AC-1 intro step · AC-2 copy step, `work.test.ts` · AC-3 order step, build test, value sourcing · AC-4 empty step · AC-5 closing step · AC-6 chips step, home step · AC-7 chips step, `projects.test.ts` · AC-8 look step · AC-9 nav step · AC-10 deploy step, build test · AC-11 head step · AC-12 width sweep step · AC-13 accessibility step · AC-14 budget step

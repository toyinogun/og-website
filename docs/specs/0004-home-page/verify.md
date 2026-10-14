# Verify: home page · spec 0004 · updated 2026-10-14
_Steps derived from spec 0004 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] Load `/` from the production build (`npm run build`, then `npx astro preview`) → inside `<main>`, the first thing in the page Container is the intro: "Open to new roles and contract work", the one h1 "I build infrastructure that stays up." at display size, the lead, then "Message me on LinkedIn"; the intro text is at most 672 pixels wide → AC-1
- [x] Edit nothing; read `src/lib/home.ts` against the page → every word on the page (title, description, intro, three section headings, closing text) comes from `HOME` → AC-2
- [x] On `/`, find the links to `https://linkedin.com/in/toyin-ogunseinde` inside `<main>` → exactly two (hero and closing), both primary buttons, neither opens a new tab → AC-3
- [x] On `/`, the Selected work section shows three cards in this order: Production Kubernetes on Hetzner Cloud, Deployer, ShipSafe; Mool is absent → AC-4
- [x] Run the `SelectedWork` empty list test and the home page test with no projects → no `selected-work` section, the intro, About and closing sections remain → AC-5
- [x] Each card shows cover, "Personal project", the title as h3, the outcome; Deployer and ShipSafe end with a "Code" link named "Code for <title>"; the Hetzner card has no link; no card links to `/projects/` → AC-6
- [x] The About section shows one paragraph, the first paragraph of `src/content/bio.md`; the sentence "I didn't start here" appears nowhere; no link to `/about` → AC-7
- [x] The closing section is the last in `<main>`: "Hiring, or need something built?", the closing text, then the button → AC-9
- [x] The header shows "Home", marked as the current page on `/` and not on `/no-such-page`; Tab order is skip link, wordmark, Home, theme toggle; header has two rows at 639 pixels, one at 640 → AC-10
- [x] The footer on `/` and on the 404 page shows LinkedIn then GitHub, both `rel="me"` → AC-11
- [x] The tab title is "Toyin Ogunseinde, DevOps and infrastructure engineer"; the meta description matches `HOME.description` → AC-12
- [x] The head of `/` and of the 404 page has `og:type`, `og:site_name`, `og:title`, `og:description` (home only), `og:url` and `twitter:card` after the canonical link, and no image tags → AC-13
- [x] At 1280 by 800 and 1440 by 900 the h1 and the hero button are fully visible and the first cover starts above the bottom edge; at 375 by 667 the hero button is fully visible → AC-14
- [x] Sweep 320, 360, 375, 639, 640, 768, 1024, 1440 pixels → no sideways scroll; the buttons fill the width below 640 and are natural width from 640; cards one per row below 768, two from 768, three from 1024 → AC-15
- [x] Headings in `<main>` go h1, h2, h3 with one h1; axe WCAG 2.2 AA finds nothing in light and in dark; every link and button is at least 24 by 24 pixels → AC-16
- [x] Load `/` and scroll to the bottom → every request goes to the site itself; `dist/index.html` holds only the theme script and the toggle script → AC-17
- [x] On the dev server (`astro dev --background`), open `/styleguide` → Page intro at display and page size, with and without eyebrow and lead; Call to action; Project card as h3 with a link (ShipSafe) and h2 without (Hetzner cluster); `design.md` lists all three components → AC-18

## Commands
- [x] `npm test` → all pass, including `home.test.ts` (limits), `text.test.ts`, the bio contract, the card and intro component tests → AC-2, AC-5, AC-6, AC-8
- [x] `npm run build && npm run test:build` → `home-build.test.ts` passes (head tags, cover widths, scripts) → AC-4, AC-6, AC-12, AC-13, AC-17
- [x] `npm run test:e2e` → `home.spec.ts` and `design-system.spec.ts` pass at desktop and mobile widths → AC-1, AC-10, AC-14, AC-15, AC-16, AC-17

## Value sourcing
- [x] Change `SITE.contact.href` locally to `/contact-test` and rebuild → both home buttons point there and the footer LinkedIn link does not change (revert after) → AC-3
- [x] Mark a different project `featured` locally, or change an `order` → the cards follow `featuredProjects` order (revert after) → AC-4
- [x] Edit the first bio paragraph locally → the About text follows it (revert after) → AC-7

## Acceptance-criteria coverage
- AC-1 intro step, e2e · AC-2 copy step, `home.test.ts` · AC-3 contact links step, value sourcing · AC-4 cards step, build test · AC-5 empty step · AC-6 card step, build test · AC-7 About step · AC-8 `text.test.ts`, bio contract · AC-9 closing step · AC-10 nav step · AC-11 footer step · AC-12 title step · AC-13 head step · AC-14 above the fold step · AC-15 width sweep step · AC-16 accessibility step · AC-17 budget step · AC-18 style guide step

# Verify: search metadata & share cards · spec 0007 · updated 2026-10-14
_Steps derived from spec 0007 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._
## UI / manual
- [x] Open the built home page source → one `og:image` under `https://toyintest.org/_astro/`, `twitter:card` `summary_large_image`, one `ld+json` block → AC-4, AC-13
- [x] Open a project page → its `og:image:alt` is that project's `coverAlt` → AC-5
- [x] Open the 404 page → `noindex`, no canonical, `og:url` or image tags → AC-7
- [x] View `src/assets/share/site-card.png` → paper background, frame, blue eyebrow, serif heading, muted line → AC-2
- [x] After the merge: paste home and one project page into LinkedIn Post Inspector and a message app → title, description and image show → AC-17 (confirmed by you on JSM-70)
## Commands
- [x] `npm run build && npm run test:build` → all pass (titles, images, sitemap, robots, JSON-LD, priority) → AC-1 to AC-11, AC-13 to AC-16
- [x] `cat dist/robots.txt` → the three line body from AC-11 → AC-11
- [x] `curl -s https://toyintest.org/robots.txt` and `curl -sI https://toyintest.org/sitemap-index.xml` after deploy → same body, 200 → AC-12 (run on JSM-70 after merge `4261443`)
## Acceptance-criteria coverage
- AC-1 to AC-11, AC-13 to AC-16 · build and unit tests · AC-12, AC-17 · live steps above

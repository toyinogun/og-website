# Verify: content model · spec 0002 · updated 2026-10-13
_Steps derived from spec 0002 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## Build proof (build plan step 7)

Each change was made on its own against the example entry, built with `npm run build`, then reverted from git. Observed on 2026-10-13 at commit `753f5ac`.

These builds must fail, naming the file:

- [x] A published entry (`draft: false`) missing `## Approach` → exit 1, `src/content/projects/example-project/index.md: body-missing-section: the section "## Approach" is missing` → AC-3
- [x] A published entry with an empty `## Outcome` → exit 1, `…/example-project/index.md: body-empty-section: the section "## Outcome" has no content` → AC-3
- [x] A missing cover (`cover.png` deleted) → exit 1, `…/example-project/index.md: cover-missing: the folder needs one cover file: …` → AC-12
- [x] A cover 1199 pixels wide → exit 1, `…/example-project/index.md: cover-width: cover.png is 1199 pixels wide, it must be at least 1200` → AC-12
- [x] A 1200 pixel cover swapped for a 1199 pixel one without touching the Markdown, on a warm cache (a passing build first, exit 0, then the swap) → exit 1, `cover-width: cover.png is 1199 pixels wide` → AC-12
- [x] An inline image pointing at a missing file → exit 1, `…/example-project/index.md: image-missing: the image ./missing.png does not exist` → AC-13
- [x] An inline image with empty alt text, in a draft → exit 1, `…/example-project/index.md: image-alt: the image ./screenshot.png needs alt text` → AC-13
- [x] Two entries with the same `order` (the example copied to `example-project-two`) → exit 1, one line naming both files: `…/example-project/index.md, …/example-project-two/index.md: duplicate-order: order 1 is used by 2 entries` → AC-4
- [x] A misspelt key inside `client` (`nmae:`) → exit 1, `[InvalidContentEntryDataError] projects → example-project data does not match collection schema. client: Unrecognized key: "nmae"`, with `Location: …/src/content/projects/example-project/index.md` → AC-2

These builds must succeed:

- [x] No entries at all (`src/content/projects/` moved away) → exit 0 → AC-10
- [x] Only drafts (the example entry as committed) → exit 0 → AC-10

## Commands

- [x] `npm run build` → exit 0 with the example draft entry → AC-1, AC-10
- [x] `npm test` → 8 files, 174 tests pass, including `src/lib/*.test.ts` and `tests/content-contract.test.ts` → AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-12, AC-13, AC-14
- [ ] A folder named `Example-Project` (not kebab case) → `npm run build` exits 1 with a `slug` problem naming the file → AC-8
- [ ] An entry with only the required fields → the content store (`getCollection('projects')`) holds `metrics: []`, `links: []`, `featured: false`, `draft: false`, and no `team`, `end` or `client.name` keys → AC-1
- [ ] Each AC-2 rule broken once in a real entry (empty after trimming, over length, unknown key at the top level, in a metric and in a link, unknown `kind`, stack, type of work and link kind, `http://` link, 4 metrics, repeated stack key, month `2024-3`, `end` before `start`, `order: 0` and `order: 1.5`) → each build exits 1 naming the file and the field → AC-2
- [ ] A published body starting with a paragraph, with sections out of order, with a repeated section, with a `#` heading and with a `===` heading → each build exits 1 with the matching `body-*` rule → AC-3
- [ ] The same broken section rules in a draft → the build passes → AC-3
- [ ] Body images with `../`, a leading `/`, an `https://` address, a `.gif`, a reference style image with empty alt, and raw `<IMG>` → each build exits 1 with `image-path`, `image-alt` or `raw-html` → AC-13

## Pages through the helpers

Run through a throwaway page that calls `getCollection('projects')` and the helpers the way features 7 to 9 will, with one published entry added beside the draft example:

- [ ] Dev server (`astro dev`): `visibleProjects(…, { includeDrafts: import.meta.env.DEV })` keeps the draft, and `featuredProjects` previews the featured draft → AC-6
- [ ] Production build: the same page lists only the published entry, and `featuredProjects` never returns the draft → AC-6, AC-10
- [ ] `sortProjects` returns lowest `order` first; `projectPath('example-project')` is `/projects/example-project` → AC-6, AC-8
- [ ] `formatTimeframe` gives `Mar 2024 to Jan 2025`, `Mar 2024 to present` and `Mar 2024`, the same under `LANG=de_DE.UTF-8` → AC-7
- [ ] `kindLabel`, `stackLabel`, `serviceLabel` return the `vocabulary.ts` display names; `linkLabel` returns a link's own label, else the kind's default → AC-9
- [ ] The cover reaches the page as an Astro image object (`src`, `width: 1200`, `height: 630`, `format: png`) through `image()` → AC-11

## Authoring

- [ ] `src/content/projects/example-project/` is a complete draft entry using every field, and `docs/specs/0002-content-model/authoring.md` covers copying the folder, every field with an example, the body and image rules, the three security notes, the dev restart caveat, adding a vocabulary value, and replacing the example → AC-14

## Acceptance criteria coverage

- AC-1: Commands (build, tests, required fields only) · AC-2: build proof (misspelt key), Commands (each rule) · AC-3: build proof (missing, empty), Commands (body rules, draft exemption)
- AC-4: build proof (duplicate order) · AC-5: `npm test` · AC-6: Pages · AC-7: Pages · AC-8: Commands (slug), Pages (path)
- AC-9: Pages · AC-10: build proof (no entries, only drafts), Pages (production) · AC-11: Pages (cover image object) · AC-12: build proof (cover)
- AC-13: build proof (missing file, empty alt in a draft), Commands (image rules) · AC-14: Authoring

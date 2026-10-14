# 0004. Home page

**Date**: 2026-10-14
**Status**: Accepted

## Summary

The home page says what you do before anything else: a small "open to new roles and contract work" line, then the big heading "I build infrastructure that stays up.", one lead line on who you are and who you work for, and one button, "Message me on LinkedIn". Under it sit your featured projects as equal cards, the first paragraph of your bio, and the same button again at the end. It is built from the spec 0003 parts plus three new shared pieces (a page intro, the project card and the call to action button) that the work, about and contact pages reuse. It also adds the "Home" nav link, fills the footer with LinkedIn and GitHub, and gives every page basic share tags built from its title and description, leaving the share image, sitemap and structured data to feature 12.

## Requirements

**User stories**:
- As a hiring reader, I want to see within seconds what you do, that you are open to roles and what your strongest work is, so that I decide to keep reading.
- As a client reader, I want to see that you take contract work and how to reach you, so that starting a conversation is one click.
- As a phone visitor, I want the heading, the lead line and the button on my first screen, so that I never have to hunt for the point of the page.
- As the site owner, I want the page words in one place I can edit, and one call to action I can repoint when the contact form ships, so that changes stay small.
- As the builder of the later pages, I want a page intro, a project card and a call to action button that already exist and are tested, so that features 8 to 11 reuse them instead of inventing their own.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: `/` renders, as the first child of the page `Container` inside `<main>`, a `PageIntro` with `size="display"` holding, in order: the availability line `HOME.availability` (a `<p>`, `--text-sm`, `muted`), the page's only `<h1>` with `HOME.heading` (Source Serif 4, `--text-display`), the lead `HOME.lead` (a `<p>`, `--text-lg`, `muted`), and the hero `CallToAction`. The intro is left aligned and its text never runs wider than `--container-measure` (42rem), inside one page width `Container`.
- **AC-2**: All home page words live in the `HOME` constant in `src/lib/home.ts` (title, description, availability, heading, lead, the three section headings, closing text), starting from the draft copy in *Feature design*. A Vitest test checks, after trimming, that every value is non empty and within its limit: `title` at most 60 characters, `description` 50 to 160, `availability` at most 50, `heading` at most 60, `lead` at most 160, each section heading at most 40, `closingText` at most 120.
- **AC-3**: `SITE.contact` in `src/lib/site.ts` is `{ label: 'Message me on LinkedIn', href: 'https://linkedin.com/in/toyin-ogunseinde' }`. `CallToAction` renders a primary `Button` as `<a href={SITE.contact.href}>` with the text `SITE.contact.label`, with no `target` attribute (same tab). Inside `<main>`, the home page holds exactly two links to `SITE.contact.href` (the hero and the closing section), both rendered by `CallToAction`, and no other primary `Button`. (The footer's LinkedIn link shares the address and sits outside `<main>`, so it is not counted.)
- **AC-4**: When `featuredProjects(visibleProjects(entries, { includeDrafts: import.meta.env.DEV }))` is not empty, the page shows a `Section` with `id="selected-work"` and the `<h2>` `HOME.workHeading`, holding a `Grid` with `cols={3}` rendered as a `<ul>`, one `<li>` per project in that order, each holding a `ProjectCard` with `headingLevel={3}`. With today's content the production page shows the Hetzner cluster, Deployer and ShipSafe, in that order, and not Mool (not featured).
- **AC-5**: `SelectedWork` given an empty list renders nothing (no section, no heading, no empty box), so the page shows only its intro, About and closing sections when no project is featured.
- **AC-6**: `ProjectCard` renders an `<article>` containing, in order: the cover through `astro:assets` `<Image>` with `alt={coverAlt}`, `widths={[400, 800, 1200]}`, the `sizes` value in *Feature design*, `width` and `height` attributes, and `--radius-md`; the kind as `kindLabel(kind)` (`--text-sm`, `muted`); the title as an `<h2>` or `<h3>` per `headingLevel` (Source Serif 4, `--text-xl`); the `outcome` (`--text-base`). When `links` is not empty it ends with one text link to `links[0].url` whose visible text is `linkLabel(links[0])` followed by a visually hidden ` for <title>`, so every card link has a unique accessible name; with no links it shows no link. The card itself is not a link, shows no metrics and no tags, and never links to `/projects/…`.
- **AC-7**: The page shows a `Section` with `id="about"` and the `<h2>` `HOME.aboutHeading`, holding one `<p>` whose text is `firstParagraph(bioSource)`, where `bioSource` is `src/content/bio.md` imported as a string (`?raw`). No text from the second bio paragraph onward appears on the page (checked against a sentence from paragraph two), and the section has no link to `/about` (feature 10 adds it).
- **AC-8**: `firstParagraph(markdown)` in `src/lib/text.ts` is pure: it trims the input, splits it at the first blank line (a line holding only whitespace), and returns that first block with each line break and the whitespace around it collapsed to one space; it returns `''` for empty or whitespace only input. A contract test reads the real `src/content/bio.md` and fails when its first paragraph is empty or contains any of `*`, `_`, `` ` ``, `[`, `<` or `#` (it is shown as plain text, so Markdown formatting would show as raw symbols).
- **AC-9**: The last section in `<main>` is a `Section` with `id="contact"` and the `<h2>` `HOME.closingHeading`, holding a `<p>` with `HOME.closingText` and then a `CallToAction`.
- **AC-10**: `SITE.nav` is `[{ label: 'Home', href: '/' }]`. On `/` the Home link carries `aria-current="page"`; on the 404 page it does not. The spec 0003 checks that assumed an empty nav are updated: the keyboard order is skip link, wordmark, Home, theme toggle, and the header shows two rows at 639 pixels and one at 640.
- **AC-11**: `SITE.links` is, in order, `{ label: 'LinkedIn', href: 'https://linkedin.com/in/toyin-ogunseinde', kind: 'profile' }` and `{ label: 'GitHub', href: 'https://github.com/toyinogun', kind: 'profile' }`, so the footer on every page shows both with `rel="me"`. The LinkedIn address is written once in `site.ts` and used by both `SITE.contact` and `SITE.links`.
- **AC-12**: The home page `<title>` is `HOME.title` and its meta description is `HOME.description`, passed to `BaseLayout` as its existing props.
- **AC-13**: `BaseLayout` writes, on every page, after the canonical link: `og:type` `website`, `og:site_name` `SITE.name`, `og:title` equal to the page title, `og:description` equal to the page description (omitted when there is none, like the meta description), `og:url` equal to the canonical URL, and `twitter:card` `summary`. It writes no `og:image`, no `twitter:image`, no structured data and no sitemap; those belong to feature 12. The `BaseLayout` props do not change.
- **AC-14**: With the shipped `HOME` words, measured after `document.fonts.ready`, on first load of the production build, at viewports of 1280 by 800 and 1440 by 900, the `<h1>` and the hero button are fully visible and the top edge of the first card's cover image is above the bottom of the viewport. At 375 by 667 (its own viewport, not the mobile project's 375 by 740) the hero button is fully visible without scrolling. If an edit to the words makes the hero too tall, this check fails and says so.
- **AC-15**: The home page passes the spec 0003 width sweep (no sideways scroll at 320, 360, 375, 639, 640, 768, 1024 and 1440 pixels). Below 640 pixels the hero button fills the content width; from 640 up it has its natural width. Cards sit one per row with the image on top below 768 pixels, two per row from 768, three per row from 1024.
- **AC-16**: The home page has exactly one `<h1>`, its headings go h1, h2, h3 without skipping a level, and the spec 0003 `@axe-core/playwright` WCAG 2.2 AA scan reports zero violations on it in both themes. Every link and button on the page, including the card links (which stand alone, so the inline text exception does not cover them), has a target of at least 24 by 24 CSS pixels (or the spacing exception applies).
- **AC-17**: The page adds no JavaScript, no dependency and no outside request: the built `dist/index.html` holds only the two scripts from spec 0003, every image it references is served from the site's own domain, and loading the page requests nothing from another host.
- **AC-18**: `design.md` lists `PageIntro`, `CallToAction` and `ProjectCard` in its component table with their values, and the dev only style guide renders each one with every prop value (`PageIntro` in both sizes, with and without eyebrow and lead; `ProjectCard` at both heading levels, with and without a link), extending spec 0003 AC-18.

## Decision

**Chosen option**: Option 2: Compose the page from the spec 0003 parts plus three shared components, with the words in one typed constant.

The page is `src/pages/index.astro` assembling `PageIntro`, `CallToAction`, `SelectedWork` (wrapping `ProjectCard`) and the existing `Container`, `Section`, `Grid` and `Button`; its words sit in `HOME` (`src/lib/home.ts`), the call to action target in `SITE.contact`, and the basic share tags in `BaseLayout`.

## Feature design

**Data model sketch**: no persisted data. Constants and props only:

| Name | Where | Shape | Rules |
|---|---|---|---|
| `HOME` | `src/lib/home.ts` | `HomeCopy`: nine `readonly` string fields, `title`, `description`, `availability`, `heading`, `lead`, `workHeading`, `aboutHeading`, `closingHeading`, `closingText` | limits in AC-2; you edit the words here |
| `SITE.contact` | `src/lib/site.ts` | `ContactAction`: `{ readonly label: string; readonly href: string }` | `href` is `https://…` or a plain site path; feature 11 changes it to `/contact` |
| `SITE.nav` | `src/lib/site.ts` | `readonly NavItem[]` (spec 0003) | becomes `[{ label: 'Home', href: '/' }]` |
| `SITE.links` | `src/lib/site.ts` | `readonly OutLink[]` (spec 0003) | LinkedIn, then GitHub, both `profile` |
| `LINKEDIN_URL` | `src/lib/site.ts`, not exported | `'https://linkedin.com/in/toyin-ogunseinde'` | the single source for AC-11 |
| Bio | `src/content/bio.md` (feature 6) | Markdown, no frontmatter | read as a string with `?raw`; only its first paragraph shows here |
| Projects | the `projects` collection (spec 0002) | `Project` | read only through `visibleProjects`, `featuredProjects`, `kindLabel`, `linkLabel` |

`Site` gains `readonly contact: ContactAction`.

**Draft copy** (the starting `HOME` values; you edit them in the build's pull request before it merges):

| Key | Draft |
|---|---|
| `title` | Toyin Ogunseinde, DevOps and infrastructure engineer |
| `description` | DevOps and infrastructure engineer in the Netherlands. Kubernetes as code, GitOps delivery and monitoring, for teams hiring and clients contracting. |
| `availability` | Open to new roles and contract work |
| `heading` | I build infrastructure that stays up. |
| `lead` | DevOps and infrastructure engineer in the Netherlands, building Kubernetes platforms, delivery pipelines and monitoring as code for teams and clients. |
| `workHeading` | Selected work |
| `aboutHeading` | About |
| `closingHeading` | Hiring, or need something built? |
| `closingText` | Tell me about the role or the project, and I will get back to you. |

**Page composition** (top to bottom, all inside one `<Container>` at page width):

1. `PageIntro size="display"`: availability, h1, lead, hero `CallToAction class="w-full sm:w-auto sm:self-start"` (the intro is a flex column that stretches its children, so `sm:self-start` is what gives the button its natural width from `sm` up).
2. `SelectedWork projects={featured} heading={HOME.workHeading}`: the `selected-work` section, or nothing.
3. `Section id="about" heading={HOME.aboutHeading}`: one `<p class="max-w-measure">` with the first bio paragraph.
4. `Section id="contact" heading={HOME.closingHeading}`: `<p class="max-w-measure">` with `HOME.closingText`, then `CallToAction class="w-full sm:w-auto sm:self-start"`, inside a `Stack`.

**Phone layout**: one column throughout. Header on two rows (wordmark and toggle, then Home). Intro top padding `3rem` (`pt-12`), from `md` `5rem` (`md:pt-20`); no bottom padding, because the next `Section` brings its own rhythm. The button fills the width below `sm`. Cards stack, image on top. Nothing scrolls sideways from 320 pixels.

**API surface** (pure helpers and component props; no endpoints):

| Name | Signature or props | Returns or renders | Notes |
|---|---|---|---|
| `firstParagraph` | `(markdown: string) => string` | the first block, line breaks collapsed | `src/lib/text.ts`, AC-8 |
| `HOME` | `HomeCopy` | constant | `src/lib/home.ts`, AC-2 |
| `SITE.contact` | `ContactAction` | constant | AC-3 |
| `PageIntro` | `{ heading: string; lead?: string; eyebrow?: string; size?: 'display' \| 'page' }`, default slot for actions | a `<div>` with `pt-12 md:pt-20`, an inner `Stack` capped at `max-w-measure`: eyebrow `<p>`, `<h1>`, lead `<p>`, slot | `display` uses `--text-display`, `page` uses `--text-3xl` (inner page h1). Default `page`. Never wraps a `Container` (spec 0003: never nested) |
| `CallToAction` | `{ class?: string }` | `<Button href={SITE.contact.href}>{SITE.contact.label}</Button>` | the only way any page shows the contact action |
| `ProjectCard` | `{ project: Project; headingLevel?: 2 \| 3 }` | `<article>` per AC-6 | default `headingLevel` 3. Feature 8 adds tag chips, feature 9 links the title to `projectPath(id)` |
| `SelectedWork` | `{ projects: readonly Project[]; heading: string }` | `Section id="selected-work"` with `Grid cols={3} as="ul"`, or nothing when empty | home only, so the empty case is testable with the container API |
| `BaseLayout` | unchanged `{ title: string; description?: string }` | adds the AC-13 tags | |

**Component values** (added to `design.md`):

| Part | Values |
|---|---|
| Page intro | top padding `3rem`, `5rem` from `md`; content `Stack` gap `md`, at most `--container-measure` wide, left aligned. Eyebrow `--text-sm` Inter `muted`. Heading serif 600, `--text-display` (`display`) or `--text-3xl` (`page`). Lead `--text-lg` `muted` |
| Call to action | a primary `Button`; full width below `sm` where the page asks for it |
| Project card | no border, no background, no shadow. `Stack` gap `sm`. Cover first, full card width, `--radius-md`, natural 1600 by 840 ratio. Kind `--text-sm` `muted`. Title serif 600 `--text-xl`. Outcome `--text-base` `text`. Link: the in text link style, `--text-base` |

**Images**: `sizes="(min-width: 64rem) 22rem, (min-width: 48rem) calc(50vw - 3rem), calc(100vw - 2.5rem)"`, Astro's default output format and lazy loading. The covers are at least 1200 pixels wide (spec 0002 AC-12), so all three widths exist.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Intro | availability, heading, lead | `HOME.availability`, `HOME.heading`, `HOME.lead` |
| Call to action | label, target | `SITE.contact.label`, `SITE.contact.href` (LinkedIn, from your answer) |
| Selected work | which projects, in what order | `getCollection('projects')` → `visibleProjects(…, { includeDrafts: import.meta.env.DEV })` → `featuredProjects` |
| Card | cover, alt, title, outcome | `cover`, `coverAlt`, `title`, `outcome` (spec 0002) |
| Card | kind label | `kindLabel(kind)` |
| Card | link target and label | `links[0].url`, `linkLabel(links[0])`; the order of `links` in the write up decides which link shows |
| Card | rendered image widths and sizes | AC-6 and *Images* above |
| About | paragraph | `firstParagraph` of `src/content/bio.md?raw` |
| Closing | heading, text | `HOME.closingHeading`, `HOME.closingText` |
| Style guide | example projects for `ProjectCard` | `getCollection('projects')`: ShipSafe (with a link), the Hetzner cluster (without) |
| `ProjectCard` tests | fixture project and cover | a minimal entry cast to `Project`, `cover` from a real `cover.png` import |
| Header | Home link, current marker | `SITE.nav`, `isCurrentPath` (spec 0003) |
| Footer | links out | `SITE.links` |
| Head | title, description | `HOME.title`, `HOME.description` via `BaseLayout` props |
| Head | share tags | the same `title` and `description` props, the canonical URL (built from `Astro.site`, spec 0001), `SITE.name` |

**Key invariants**:
- Exactly one call to action target exists in the code, `SITE.contact`; every page shows it only through `CallToAction`.
- The site never links to a page that does not exist: no link to `/work`, `/projects/…`, `/about` or `/contact` until those features ship them (the nav build test from spec 0003 still holds).
- Pages pick and order projects only through the spec 0002 helpers.
- The bio text exists once, in `bio.md`; the home page reads it, never copies it.
- No new JavaScript, dependency or outside request.
- One `<main>` (from `BaseLayout`) and one `<h1>` per page.
- At most one primary button on any screen; the page repeats its one action further down, where the two never share a viewport (the rule as clarified in `design.md`).

**Security model**: a public, read only static page. It shows only facts you chose to publish; the LinkedIn and GitHub addresses are public already. No form, no stored data, no personal data from visitors. No compliance scope.

**Critical test scenarios** (each maps to an acceptance criterion in *Requirements*):
- Happy path: the production build's home page shows the availability line, the heading, the lead and a button to LinkedIn, then three cards in `order`, the first bio paragraph and the closing button, verifies **AC-1**, **AC-3**, **AC-4**, **AC-7**, **AC-9**
- Empty: `SelectedWork` with `[]` renders an empty string; the page keeps its other sections, verifies **AC-5**
- Card: a container render with a project that has links shows one link with a unique name; one without links shows none; no `/projects/` href ever, verifies **AC-6**
- Helpers and copy: `firstParagraph` on one paragraph, several, Windows line breaks, leading blank lines and empty input; `HOME` limits; the real bio first paragraph is plain text, verifies **AC-2**, **AC-8**
- Nav and footer: Home is current on `/` and not on the 404 page; the footer shows LinkedIn then GitHub with `rel="me"`; keyboard order now includes Home, verifies **AC-10**, **AC-11**
- Head: `dist/index.html` has the home title and description, the six share tags with matching values and no image tag; a page rendered without a description gets no `og:description`, verifies **AC-12**, **AC-13**
- Above the fold and phone: at 1280 by 800 and 1440 by 900 the first cover starts inside the viewport; at 375 by 667 the hero button is fully visible; the width sweep and column counts hold, verifies **AC-14**, **AC-15**
- Accessibility: heading order, axe at WCAG 2.2 AA in both themes, target sizes, verifies **AC-16**
- Budget: only the two spec 0003 scripts, no third party requests, verifies **AC-17**
- Style guide: each new component renders with every prop value on the dev server and never in `dist/`, verifies **AC-18**
- Auth/permission: not applicable; a public static page with no protected surface.

## Build plan

Skateboard: the first milestone alone replaces the placeholder with a usable home page (who you are, what you do, one way to reach you, real share previews); the second adds the proof and the rest of the page; the third locks it in with browser checks.

**Milestone 1: who you are and how to reach you, live**
1. In `src/lib/site.ts`: add `LINKEDIN_URL`, `ContactAction`, `SITE.contact`; set `SITE.nav` to Home and `SITE.links` to LinkedIn and GitHub; extend `site.test.ts`, satisfies **AC-3**, **AC-10**, **AC-11**
2. Create `src/lib/home.ts` (`HomeCopy`, `HOME` with the draft copy) with `home.test.ts` for the limits, satisfies **AC-2**, **AC-12**
3. Add the share tags to `BaseLayout.astro` and extend `BaseLayout.test.ts` (with and without a description), satisfies **AC-13**
4. Build `PageIntro.astro` and `CallToAction.astro` with documented `Props` and container tests, satisfies **AC-1**, **AC-3**
5. Rewrite `src/pages/index.astro` with the intro and the closing section on `HOME`; rewrite `tests/home-page.test.ts` for the new title, description, single h1 and the two contact links inside `<main>`. This test checks only what does not read the `projects` collection; the cards on the real page are checked by the build test (step 11) and the browser tests (step 12), because rendering `getCollection` through the container API depends on a synced data store, satisfies **AC-1**, **AC-3**, **AC-9**, **AC-12**

**Milestone 2: the proof and the rest of the page**
6. Create `src/lib/text.ts` (`firstParagraph`) with `text.test.ts`, and add the bio plain text check to `tests/content-contract.test.ts`. Confirm the `bio.md?raw` import works in both `astro build` and Vitest (no file imports Markdown with `?raw` yet); if either fails, use `import.meta.glob('../content/bio.md', { query: '?raw', import: 'default', eager: true })` instead, satisfies **AC-7**, **AC-8**
7. Build `ProjectCard.astro` (cover image, kind, title, outcome, first link with its hidden suffix) with container tests at both heading levels and with and without links. The tests build a minimal `Project` fixture whose `cover` is a real `cover.png` import (for example from `src/content/projects/shipsafe/`), cast to the entry type; `srcset` and width checks stay in the build test, since the container renders development image URLs, satisfies **AC-6**
8. Build `SelectedWork.astro` with container tests for a filled and an empty list, satisfies **AC-4**, **AC-5**
9. Add the Selected work and About sections to `index.astro` (projects through the spec 0002 helpers, bio through `?raw` and `firstParagraph`), satisfies **AC-4**, **AC-7**
10. Add the three components to the dev style guide with every prop value; its `ProjectCard` examples read real entries with `getCollection('projects')` (ShipSafe for with a link, the Hetzner cluster for without), and extend `src/dev/styleguide.test.ts` (their `design.md` rows were added with this spec), satisfies **AC-18**

**Milestone 3: the checks**
11. Extend `tests/build/design-build.test.ts` (or add `tests/build/home-build.test.ts`): home head tags and values, no `og:image`, cover `srcset` with three widths and `width` and `height`, only the two spec 0003 scripts, satisfies **AC-6**, **AC-13**, **AC-17**
12. Rewrite `e2e/home.spec.ts`, keeping its canonical, `_worker.js`, 404, favicon and no overflow tests and replacing the placeholder check of `main > div` at 672 pixels: content order, above the fold at 1280 by 800 and 1440 by 900, the hero button at 375 by 667, the button width below and above 640, the column counts, heading order, axe in both themes, target sizes (add `main article a` to the selector, which today only covers `main a.inline-flex`), no third party requests, satisfies **AC-14**, **AC-15**, **AC-16**, **AC-17**
13. Update `e2e/design-system.spec.ts` for the non empty nav (keyboard order with Home, two header rows at 639 and one at 640, Home current only on `/`), and move or rename its "nothing focusable in main" test, which runs on `/` and is no longer true there. `SiteHeader.test.ts` and `SiteFooter.test.ts` pass explicit props and stay as they are, satisfies **AC-10**

## Consequences

**Positive**:
- A first time visitor gets what you do, that you are available, and your three strongest projects on one laptop screen.
- Features 8 to 11 start with a tested page intro, project card and call to action, so they build content, not layout.
- Repointing the call to action to the contact form later is a two line change in `site.ts`.
- Every page now shows a real title and description when pasted into a message, before feature 12.
- The footer stops being empty on every page.

**Negative / tradeoffs**:
- The call to action sends people to LinkedIn, so the conversation starts off your site and needs a LinkedIn account; visitors without one have no way in until the contact form ships.
- Until feature 9, the cards open your code on GitHub rather than the case study, so the reader sees code before your explanation of it. A card's link label is the plain kind name ("Code") unless the write up sets its own `label`. The Hetzner cluster write up has no links, so the first and strongest card shows no link until feature 9 (your decision, 2026-10-14).
- Share previews stay text only (no image) until feature 12, so they look plainer than they will.
- Adding the Home link puts a second header row on phones and repeats what the wordmark already does.
- Every featured project today is a personal project, so the kind label reads the same on all three home cards; it earns its place on the work listing (feature 8), where kinds differ.
- The project grid is a `<ul>` styled without bullets, which Safari VoiceOver may stop announcing as a list. Accepted for now; `Grid` has no `role` prop.
- The About paragraph must stay plain text; a future bio edit that adds bold or a link to the first paragraph fails the test until the home page learns to render Markdown.

**Neutral**:
- Spec 0003's note that feature 8 designs the project card is replaced: the card is built here and feature 8 adds the tag chip and uses it.
- Spec 0003's browser tests that assumed an empty nav change with this feature.
- `src/lib/` gains a copy module (`home.ts`) and a text helper (`text.ts`).

## Follow-up

- [ ] Before the build's pull request merges, edit the draft words in `src/lib/home.ts` until they sound like you.
- [ ] Optional: give each project link a `label` in its write up (for example `Code on GitHub`) if you want more than "Code" on the cards.
- [ ] Feature 8 (work listing) uses `PageIntro size="page"` and `ProjectCard headingLevel={2}`, adds the tag chip, and adds its `Work` nav link.
- [ ] Feature 9 (project detail page) makes the card title link to `projectPath(id)` and keeps the outside link.
- [ ] Feature 10 (about page) adds a "More about me" link to the home About section and its `About` nav link.
- [ ] Feature 11 (contact form) changes `SITE.contact` to `/contact` with a new label, and revisits `HOME.closingText`.
- [ ] Feature 12 (search metadata and share cards) builds on the share tags in `BaseLayout`: adds the image, sitemap and structured data, and decides per page share images.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

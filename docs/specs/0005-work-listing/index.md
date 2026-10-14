# 0005. Work listing

**Date**: 2026-10-14
**Status**: Proposed

## Summary

The work listing at `/projects` shows every published project as a card, in your chosen order, so a hiring or client reader can scan all your work on one page. It reuses the home page parts (page intro, project card, call to action) and adds one new small piece, a quiet outlined "chip" (a small label) for each of the first five technologies a project used. The page ends with one closing section holding your call to action, and it shows a short "on their way" line if no project is published. It also adds the `Work` link to the header and makes the site serve pages at addresses without a trailing slash, so `/projects` opens directly.

## Requirements

**User stories**:
- As a hiring reader, I want every project on one page with its outcome and the technologies it used, so that I can judge your range in a minute.
- As a client reader, I want to see what kind of work each project was and open the one that matches my problem, so that I know you have done something like it.
- As a reader who has scanned the work, I want one clear way to reach you at the end, so that starting a conversation is one click.
- As a phone visitor, I want the cards in one readable column with nothing scrolling sideways, so that the page works on my phone.
- As the site owner, I want the page words in one place and the card order set by the write ups, so that changes stay small.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: `src/pages/projects/index.astro` builds `dist/projects/index.html`. Inside `<main>`, the first child of the page `Container` (page width) is a `PageIntro` with `size="page"`, `heading={WORK.heading}` (the page's only `<h1>`, Source Serif 4 at `--text-3xl`) and `lead={WORK.lead}`, with no eyebrow and no slotted action.
- **AC-2**: All words on the page live in the `WORK` constant in `src/lib/work.ts` (`title`, `description`, `heading`, `lead`, `emptyText`, `closingHeading`, `closingText`), starting from the draft copy in *Feature design*. A Vitest test checks, after trimming, that every value is non empty and within its limit: `title` at most 60 characters, `description` 50 to 160, `heading` at most 60, `lead` at most 160, `emptyText` at most 80, `closingHeading` at most 40, `closingText` at most 120. `emptyText` does not contain the word `LinkedIn` (the contact target can change, feature 11).
- **AC-3**: The page passes `sortProjects(visibleProjects(await getCollection('projects'), { includeDrafts: import.meta.env.DEV }))` to `WorkList`. With a non empty list, `WorkList` renders a `Section` with `id="projects"` and no heading, holding a `Grid` with `cols={3}` rendered as a `<ul>`, one `<li>` per project in the given order, each holding `<ProjectCard project={project} headingLevel={2} showStack />`. Featured and not featured projects show alike. With today's content the production page shows, in order: Production Kubernetes on Hetzner Cloud, Deployer, ShipSafe, Mool.
- **AC-4**: `WorkList` given an empty list renders a `Section` with `id="projects"` holding exactly one `<p class="max-w-measure">` with the `emptyText` prop, and no `<ul>`, no card and no button. The page passes `WORK.emptyText`. The closing section (AC-5) still follows, so an empty page keeps its one way to reach you.
- **AC-5**: The last section in `<main>` is a `Section` with `id="contact"` and the `<h2>` `WORK.closingHeading`, holding (inside a `Stack`) a `<p class="max-w-measure">` with `WORK.closingText` and then `<CallToAction class="w-full sm:w-auto sm:self-start" />`. Inside `<main>` there is exactly one link to `SITE.contact.href` and no other primary `Button`.
- **AC-6**: `ProjectCard` gains `showStack?: boolean`, default `false`. When `true`, it renders, after the outcome and before the link, one `<ul aria-label="Stack">` with one `<li>` per value of `cardStackLabels(project.data.stack)`, in that order. When `false` or absent it renders no stack list, so the home cards are unchanged and spec 0004 AC-6 ("no tags") still holds on `/`. The chips are plain text: no `<a>`, no `<button>`, no `tabindex`, no `title`.
- **AC-7**: `cardStackLabels(stack)` in `src/lib/projects.ts` is pure: it returns the display names (`stackLabel`) of the first `CARD_STACK_LIMIT` keys of `stack`, in the written order, where `CARD_STACK_LIMIT` is an exported constant `5`; a list of 5 or fewer comes back whole; it never mutates its input. For the Hetzner cluster it returns `Kubernetes`, `Talos Linux`, `Terraform`, `Hetzner Cloud`, `Argo CD`; for ShipSafe `Go`, `Docker`.
- **AC-8**: Each chip uses the tag chip values in *Feature design* (`--text-sm` Inter 400, `muted` text, 1px `line` border, `--radius-sm`, padding `0.125rem 0.5rem`, no background, no accent), written once as the classes `rounded-sm border border-line px-2 py-0.5 text-sm text-muted` on each `<li>`, with `flex flex-wrap gap-2` on the `<ul>`; the list wraps with a `0.5rem` gap and never makes its card wider than its grid cell (at 320 pixels each chip list's right edge is at or inside its card's `<li>` right edge). `design.md` holds the Tag chip and Work list rows and the updated Project card row (added with this spec), and the dev only style guide shows `ProjectCard` with `showStack` (the Hetzner cluster, to show the limit) and `WorkList` filled and empty, extending spec 0004 AC-18.
- **AC-9**: `SITE.nav` is `[{ label: 'Home', href: '/' }, { label: 'Work', href: '/projects' }]`. On `/projects`, Work carries `aria-current="page"` and Home does not; on `/`, Home does and Work does not; on the 404 page neither does. A unit test confirms `isCurrentPath('/projects/deployer', '/projects')` is true (feature 9 pages). The checks that assumed a Home only nav are updated: `site.test.ts`, the keyboard order (skip link, wordmark, Home, Work, theme toggle) and the header rows (two rows at 639 pixels, one row at 640 with both links on it) in `e2e/design-system.spec.ts`.
- **AC-10**: Pages are served at addresses without a trailing slash: `astro.config.mjs` sets `trailingSlash: 'never'` (build output stays `dist/projects/index.html`) and `wrangler.jsonc` sets `assets.html_handling` to `"drop-trailing-slash"`. The canonical link and `og:url` on the page are `https://toyintest.org/projects`. On the deployed site `GET /projects` answers 200 with no redirect, `GET /projects/` answers a 3xx (Cloudflare uses 307) with `location: /projects`, `/` still answers 200, and an unknown path still gets the 404 page with status 404. `tests/stack-contract.test.ts` locks both config values. The deployed checks are recorded by pasting the `curl` results as a comment on the feature's ship issue.
- **AC-11**: The page `<title>` is `WORK.title` and its meta description is `WORK.description`, passed to `BaseLayout`, which writes the spec 0004 share tags from them (no `og:image`).
- **AC-12**: The page passes the spec 0003 width sweep (no sideways scroll at 320, 360, 375, 639, 640, 768, 1024 and 1440 pixels). Cards sit one per row with the image on top below 768 pixels, two per row from 768, three per row from 1024 (checked by counting the distinct top edges of the first three cards: 3 rows at 767, 2 at 768 and 1023, 1 at 1024). Below 640 pixels the closing button fills the content width; from 640 up it has its natural width.
- **AC-13**: The page has exactly one `<h1>`; its headings go h1, then an h2 per card, then the closing h2, without skipping a level. The spec 0003 `@axe-core/playwright` WCAG 2.2 AA scan reports zero violations in both themes, and every link and button on the page is at least 24 by 24 CSS pixels (or the spacing exception applies).
- **AC-14**: The page adds no JavaScript, no dependency and no outside request: `dist/projects/index.html` holds only the two spec 0003 scripts, every image it references comes from the site's own domain, each cover has a `srcset` with the three widths and `width` and `height` attributes, and loading the page requests nothing from another host.

## Decision

**Chosen option**: Option 1: a new route built from the spec 0004 parts, a `WorkList` component, an opt in `showStack` prop on `ProjectCard`, and the words in a `WORK` constant.

`src/pages/projects/index.astro` assembles `PageIntro`, `WorkList` (wrapping `Grid` and `ProjectCard`) and a closing `Section` with `CallToAction`; the words sit in `WORK` (`src/lib/work.ts`), the chip limit in `cardStackLabels` (`src/lib/projects.ts`), and the site switches to addresses without a trailing slash.

## Feature design

**Data model sketch**: no persisted data. Constants, props and the existing `projects` collection:

| Name | Where | Shape | Rules |
|---|---|---|---|
| `WORK` | `src/lib/work.ts` | `WorkCopy`: seven `readonly` string fields, `title`, `description`, `heading`, `lead`, `emptyText`, `closingHeading`, `closingText` | limits in AC-2; you edit the words here |
| `SITE.nav` | `src/lib/site.ts` | `readonly NavItem[]` (spec 0003) | becomes Home, then Work (`/projects`) |
| `CARD_STACK_LIMIT` | `src/lib/projects.ts` | `5` | the one place the chip count lives |
| Projects | the `projects` collection (spec 0002) | `Project` | read only through `visibleProjects`, `sortProjects`, `kindLabel`, `linkLabel`, `cardStackLabels`; `stack` is already a non empty list of known keys with no repeats (spec 0002) |

**Draft copy** (the starting `WORK` values; you may edit them in the build's pull request before it merges):

| Key | Draft |
|---|---|
| `title` | Work by Toyin Ogunseinde, DevOps engineer |
| `description` | Projects by Toyin Ogunseinde, DevOps and infrastructure engineer: Kubernetes platforms, deploy tooling and CI checks, each with its outcome and its stack. |
| `heading` | Work |
| `lead` | Platforms, pipelines and tools I have built, each with what it achieved and what it runs on. |
| `emptyText` | Write ups are on their way. |
| `closingHeading` | Want something like this built? |
| `closingText` | Tell me about the role or the project, and I will get back to you. |

**Page composition** (top to bottom, all inside one `<Container>` at page width):

1. `PageIntro size="page" heading={WORK.heading} lead={WORK.lead}`: no eyebrow, nothing in the slot.
2. `WorkList projects={projects} emptyText={WORK.emptyText}`: the `projects` section with the card grid, or the empty line.
3. `Section id="contact" heading={WORK.closingHeading}`: a `Stack` with `<p class="max-w-measure">{WORK.closingText}</p>`, then `CallToAction class="w-full sm:w-auto sm:self-start"`.

The projects section has no heading of its own: the `<h1>` names the page and each card title is an `<h2>`, which is why the cards use `headingLevel={2}`.

**Card, top to bottom** (on this page): cover, kind, title (`<h2>`), outcome, the stack chips, then the write up's first link. The order on the home page is unchanged (no chips).

**Phone layout**: one column throughout. Header on two rows (wordmark and toggle, then Home and Work). Intro top padding `3rem`, `5rem` from `md`. Cards stack, image on top; chips wrap onto as many lines as they need inside the card. The closing button fills the width below `sm`.

**API surface** (pure helpers and component props; no endpoints):

| Name | Signature or props | Returns or renders | Notes |
|---|---|---|---|
| `WORK` | `WorkCopy` | constant | `src/lib/work.ts`, AC-2 |
| `CARD_STACK_LIMIT` | `5` | constant | exported from `src/lib/projects.ts` |
| `cardStackLabels` | `(stack: readonly StackKey[]) => readonly string[]` | at most `CARD_STACK_LIMIT` display names, written order | `src/lib/projects.ts`, AC-7; `StackKey` from `vocabulary.ts` |
| `ProjectCard` | `{ project: Project; headingLevel?: 2 \| 3; showStack?: boolean }` | `<article>` per spec 0004 AC-6, plus the stack list when `showStack` | default `showStack` false, AC-6 |
| `WorkList` | `{ projects: readonly Project[]; emptyText: string }` | `Section id="projects"` with `Grid cols={3} as="ul"` of cards, or the empty `<p>` | `src/components/WorkList.astro`; a component so the empty case is testable with the container API, like `SelectedWork` |
| `/projects` | static page | AC-1 to AC-5, AC-11 | `src/pages/projects/index.astro`; feature 9 adds `src/pages/projects/[slug].astro` beside it |
| `SITE.nav` | `readonly NavItem[]` | constant | AC-9 |
| Config | `trailingSlash: 'never'` in `astro.config.mjs`; `"html_handling": "drop-trailing-slash"` under `assets` in `wrangler.jsonc` | addresses without a trailing slash | AC-10 |

**Component values** (added to `design.md` with this spec):

| Part | Values |
|---|---|
| Tag chip | an `<li>` in a `<ul aria-label="Stack">`. `--text-sm` Inter 400, `muted` text, 1px `line` border, `--radius-sm`, padding `0.125rem 0.5rem`, no background, no accent: exactly `rounded-sm border border-line px-2 py-0.5 text-sm text-muted`. Not interactive. The list is `flex flex-wrap gap-2` (`0.5rem`), no bullets |
| Project card | spec 0004 values, plus: with `showStack`, the tag chips sit between the outcome and the link |
| Work list | `Section id="projects"` without a heading: a 3 column `Grid` as a `<ul>`, or one `max-w-measure` paragraph when empty |

**Images**: unchanged from spec 0004 (`ProjectCard` `sizes`, widths 400, 800 and 1200, Astro's default lazy loading).

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Intro | heading, lead | `WORK.heading`, `WORK.lead` |
| Project list | which projects, in what order | `getCollection('projects')` → `visibleProjects(…, { includeDrafts: import.meta.env.DEV })` → `sortProjects` (the `order` field of each write up; your decision, featured or not) |
| Card | cover, alt, kind, title, outcome, link | spec 0004 sources, unchanged |
| Card | chips: which, how many, in what order | `cardStackLabels(project.data.stack)`: the first `CARD_STACK_LIMIT` (5) keys in the order the write up lists them, named by `stackLabel` (your decision) |
| Card | heading level | `headingLevel={2}`, from the page composition |
| Empty state | the line | `WORK.emptyText` (your decision: one line, then the normal closing section) |
| Closing | heading, text | `WORK.closingHeading`, `WORK.closingText` |
| Closing | button label and target | `SITE.contact` through `CallToAction` (spec 0004) |
| Header | Work link, current marker | `SITE.nav`, `isCurrentPath` (spec 0003) |
| Head | title, description, share tags | `WORK.title`, `WORK.description` via `BaseLayout` (spec 0004 AC-13) |
| Head | canonical and `og:url` | `Astro.url.pathname` with `trailingSlash: 'never'` → `/projects`, joined to `Astro.site` |
| Style guide | example projects | `getCollection('projects')`: for `showStack`, the entry with id `hetzner-talos-cluster`, falling back to the entry with the longest `stack` (9 keys, shows 5); all visible projects for the filled `WorkList`; `[]` for the empty one. The `styleguide.test.ts` mock adds a fixture with at least 6 stack keys |
| `WorkList` and `ProjectCard` tests | fixture projects | the spec 0004 minimal `Project` fixture with two stacks: the 9 Hetzner keys (`kubernetes`, `talos`, `terraform`, `hetzner`, `argocd`, `cilium`, `longhorn`, `prometheus`, `grafana`; expected chips Kubernetes, Talos Linux, Terraform, Hetzner Cloud, Argo CD) and `['go', 'docker']` (expected Go, Docker) |

**Key invariants**:
- Pages pick, order and format projects only through the spec 0002 helpers plus `cardStackLabels`; no page or component slices `stack` itself.
- The home page shows no chips: only the listing passes `showStack`.
- One call to action target, `SITE.contact`, shown only through `CallToAction`; one on this page, at the end.
- The site never links to a missing page: the `Work` nav entry ships in the same change as `/projects` (the spec 0003 nav build test checks it).
- One `<main>` and one `<h1>` per page. No new JavaScript, dependency or outside request.
- Every nav href and internal page address has no trailing slash, and the host serves exactly those addresses without a redirect.

**Security model**: a public, read only static page showing only what you chose to publish in the write ups. No form, no stored data, no visitor data. Draft write ups stay out of the production build through `visibleProjects`. No compliance scope.

**Critical test scenarios** (each maps to an acceptance criterion in *Requirements*):
- Happy path: the production `/projects` shows the intro, four cards in `order` with chips, and the closing button, verifies **AC-1**, **AC-3**, **AC-5**, **AC-6**
- Empty: `WorkList` with `[]` renders the one line and no list; the page keeps its closing section, verifies **AC-4**, **AC-5**
- Card: a container render with `showStack` and a 9 key stack shows exactly 5 chips in order with no interactive element; without `showStack` it shows no list; a 2 key stack shows 2, verifies **AC-6**, **AC-7**
- Helper and copy: `cardStackLabels` on 0 to 9 keys and input left unchanged; `WORK` limits and no `LinkedIn` in `emptyText`, verifies **AC-2**, **AC-7**
- Nav: Work current on `/projects` (and on `/projects/deployer` in the unit test), Home current only on `/`, neither on the 404 page; keyboard order and header rows with both links, verifies **AC-9**
- Addresses: built canonical and `og:url` are `https://toyintest.org/projects`; after deploy, `/projects` is 200 with no redirect and `/projects/` redirects to it, verifies **AC-10**, **AC-11**
- Layout and phone: width sweep, column counts, chips wrapping inside cards, closing button widths, verifies **AC-8**, **AC-12**
- Accessibility: heading order, axe in both themes, target sizes, verifies **AC-13**
- Budget: only the two spec 0003 scripts, cover `srcset`, no third party requests, verifies **AC-14**
- Auth/permission: not applicable; a public static page with no protected surface. Drafts never reach the production build, verifies **AC-3**

## Build plan

Skateboard: the first milestone alone ships a usable listing reachable from the header (every project, in order, with a way to reach you); the second adds the chips; the third locks it in with build and browser checks.

**Milestone 1: the listing, live and linked**
1. Create `src/lib/work.ts` (`WorkCopy`, `WORK` with the draft copy) and `work.test.ts` for the limits and the `LinkedIn` rule, satisfies **AC-2**, **AC-11**
2. Set `trailingSlash: 'never'` in `astro.config.mjs` and `"html_handling": "drop-trailing-slash"` under `assets` in `wrangler.jsonc`; run `npm run build` and confirm the output stays `dist/<path>/index.html` and the home canonical stays `https://toyintest.org/`; lock both values in `tests/stack-contract.test.ts`; once the page exists (step 4), add an early smoke check to `e2e/home.spec.ts` or `e2e/work.spec.ts`: `/projects` and `/` answer 200 and `/no-such-page` answers 404, satisfies **AC-10**
3. Build `src/components/WorkList.astro` with documented `Props` and container tests for a filled and an empty list, satisfies **AC-3**, **AC-4**
4. Create `src/pages/projects/index.astro` (intro, `WorkList` through the spec 0002 helpers, closing section on `WORK`) and `tests/work-page.test.ts`. Like `home-page.test.ts`, it mocks `astro:content` so `getCollection` returns `[]` (the container cannot render real covers) and renders with the request URL `http://localhost:4321/projects`; it checks the title, description, one h1, the empty line and the closing section appearing together, and the one contact link. The real cards are checked by the build and browser tests, satisfies **AC-1**, **AC-3**, **AC-4**, **AC-5**, **AC-11**
5. Add `{ label: 'Work', href: '/projects' }` to `SITE.nav`; update `site.test.ts` (nav value, `isCurrentPath('/projects/deployer', '/projects')`), and in `e2e/design-system.spec.ts` the keyboard order, the 639 and 640 pixel header rows test, and the existing "Home current" test (add `/projects`: Work current, Home not; `/no-such-page` keeps neither); add `/projects` to the shared path lists of its axe, target size and width sweep tests rather than copying them, satisfies **AC-9**, **AC-12**, **AC-13**

**Milestone 2: the stack chips**
6. Add `CARD_STACK_LIMIT` and `cardStackLabels` to `src/lib/projects.ts` with tests in `projects.test.ts`, satisfies **AC-7**
7. Add `showStack` to `ProjectCard.astro` (the chip list between outcome and link) and extend `project-components.test.ts`: with and without `showStack`, a 9 key and a 2 key stack, no interactive element in the list; pass `showStack` from `WorkList`, satisfies **AC-6**, **AC-8**
8. Add `ProjectCard` with `showStack` (the `hetzner-talos-cluster` entry, else the longest `stack`) and `WorkList` filled and empty to the dev style guide, and extend `src/dev/styleguide.test.ts` (its `getCollection` mock gains a fixture with at least 6 stack keys) (the `design.md` rows were added with this spec), satisfies **AC-8**

**Milestone 3: the checks**
9. Add `tests/build/work-build.test.ts`: `dist/projects/index.html` exists; title, description, canonical and `og:url` without a trailing slash; the four card titles in order; 5 chips on the Hetzner card; only the two spec 0003 scripts; cover `srcset` with three widths and `width` and `height`; `dist/index.html` has no `aria-label="Stack"`, satisfies **AC-3**, **AC-6**, **AC-10**, **AC-11**, **AC-14**
10. Add `e2e/work.spec.ts`: content order, column counts at 767, 768, 1023 and 1024 (distinct top edges of the first three cards), chips inside their card at 320 pixels, closing button width below and above 640, heading order, no third party requests (Work current, axe, target sizes and the width sweep come from the shared `design-system.spec.ts` lists, step 5), satisfies **AC-9**, **AC-12**, **AC-13**, **AC-14**

## Consequences

**Positive**:
- Every published project is one click from any page, in the order you set in the write ups.
- Readers see what each project ran on without opening it, which matters to both hiring and client readers.
- The home page is untouched: the chips are opt in, and the card stays one component with one set of tests.
- Addresses without a trailing slash match the nav pattern spec 0003 already set, and feature 9's `/projects/<slug>` pages get the same clean addresses for free.

**Negative / tradeoffs**:
- Five chips is a cut: the Hetzner cluster hides Cilium, Longhorn, Prometheus and Grafana on its card. You control which five show by ordering the `stack` list in the write up; the full list waits for the project page (feature 9).
- With four projects and three columns, Mool sits alone on the second row on a laptop.
- Every project is personal work today, so the kind line reads the same on all four cards.
- The trailing slash change touches deployment config (spec 0001's `wrangler.jsonc`) and changes how every future page address resolves; it cannot be checked by the local browser tests (`astro preview` is not Cloudflare), only on the deployed site.
- Until feature 9, the cards still open your code on GitHub rather than a case study, and the Hetzner card has no link.
- Covers use lazy loading, so the first row's images may appear a moment later than they could on a fast connection.

**Neutral**:
- Spec 0004 AC-10 (a Home only nav) is updated by AC-9 here; its other criteria are unchanged.
- `src/pages/` gains a `projects/` folder, which feature 9 fills with `[slug].astro`.
- The empty state is reachable only if every write up goes back to draft; it is checked through `WorkList`, not the real page.

## Follow-up

- [ ] Before the build's pull request merges, edit the draft words in `src/lib/work.ts` until they sound like you.
- [ ] Optional: reorder each write up's `stack` list so its five most telling technologies come first.
- [ ] Feature 9 (project detail page) adds `src/pages/projects/[slug].astro`, links the card title to `projectPath(id)` (no trailing slash), and shows the full stack.
- [ ] Feature 11 (contact form) revisits `WORK.closingText` alongside `HOME.closingText` when `SITE.contact` moves to `/contact`.
- [ ] Feature 12 (search metadata and share cards) decides eager loading for above the fold covers, and the sitemap uses the addresses without a trailing slash.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

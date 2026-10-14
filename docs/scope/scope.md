# Scope: Toyin Ogunseinde personal website

A personal site whose job is to win work. It serves two readers at once, the person deciding whether to hire you and the person deciding whether to contract you, and both want the same thing: real work, clearly explained, with an easy way to start a conversation.

**Build approach:** Skateboard (ship the thinnest usable whole site, then grow it).
**Workflow:** Alpha (after `/develop`, run `/check verify` on the real running site). The project default level of rigor. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag (e.g. `· Beta`) to do more or less.

**Constraints you set:** something presentable in about two weeks, running cost at or near zero, and a domain you already own (`toyintest.org`, see feature 5).

**How content gets written:** the bio and project write ups get drafted from your resume and your repositories, then you edit them. You keep the final say on every word, and the build never waits on a blank page.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Stack & architecture | Foundation | done |
| 2 | Coding standards & tooling | Foundation | done |
| 3 | Content model | Foundation | done |
| 4 | Design system & UI foundation | Foundation | done |
| 5 | Live on your domain | Foundation | done |
| 6 | Bio & project write ups | Release 1 | done |
| 7 | Home page | Release 1 | done |
| 8 | Work listing | Release 1 | done |
| 9 | Project detail page | Release 1 | done |
| 10 | About page | Release 1 | done |
| 11 | Contact form | Release 1 | done |
| 12 | Search metadata & share cards | Release 1 | done |
| 13 | Services & how you work | Release 2 | planned |
| 14 | Testimonials | Release 2 | planned |
| 15 | Blog | Release 3 | planned |
| 16 | Newsletter signup | Release 3 | planned |

## Foundations

### 1. Stack & architecture · Beta
Decide the framework, language, hosting and content tooling, then scaffold a runnable project. This is the one place tools and providers get chosen, and your zero running cost constraint binds here.
**Done when:** the stack and the hosting choice are recorded in a spec, the scaffold boots locally, the production build passes, and the hosting choice is confirmed to cost nothing at this traffic level.
- [x] Decide the stack (spec): `/architect stack & architecture`
- [x] Scaffold from the decision: `/develop scaffold`
- [x] Confirm the hosting cost is zero: record the account, plan, Workers Builds allowance and exhaustion behaviour from the Cloudflare dashboard, into spec 1's Follow-up
- [x] Verify it: `/check verify scaffold`
- [x] Test it: `/test scaffold`

spec [0001](../specs/0001-stack-architecture/index.md) · decided: Astro static on Cloudflare Workers, TypeScript strict, Tailwind, Markdown content collections, Workers Builds · code in the repository root (`astro.config.mjs`, `wrangler.jsonc`, `tsconfig.json`, `src/`)

### 2. Coding standards & tooling
Capture the conventions and tooling choices from the real scaffolded project, then install them. Doing this early means every later page is written to the same rules.
**Done when:** root `AGENTS.md` reflects the real stack and conventions, and lint, format and the type check all run clean.
- [x] Capture conventions and tooling choices: `/audit`
- [x] Install the tooling: `/develop tooling`

code in the repository root (`eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.husky/pre-commit`, `.github/workflows/ci.yml`, `package.json` scripts and `lint-staged`)

### 3. Content model
The shape of a project entry and the structure of a case study: what a write up contains, in what order, and which fields the pages can rely on. This is the data model of a content site, and it is the most expensive thing here to get wrong, because changing it later means rewriting every write up and every page that reads one.
**Done when:** the fields of a project entry are fixed and written down, a case study has a defined structure that works for a hiring reader and a client reader, and the model covers images, links, tags and ordering without a later rewrite.
- [x] Design it (spec): `/architect content model`
- [x] Build it: `/develop content model`
  - [x] Schema and vocabulary: the fixed tag lists and the strict project schema (AC-1, AC-2, AC-9)
  - [x] Checks in the build: body, image, cover, order and slug checks, run by the collection loader (AC-3, AC-4, AC-5, AC-8, AC-11, AC-12, AC-13)
  - [x] Helpers, example entry, authoring guide and the real build proof (AC-1, AC-5, AC-6, AC-7, AC-10, AC-14)
- [x] Verify it: `/check verify content model`

spec [0002](../specs/0002-content-model/index.md) · decided: one typed `projects` collection, one folder per project, 19 strict fields, case study under Problem, Approach, Outcome, checks enforced in the build and in the tests · code in `src/content.config.ts`, `src/lib/` (`vocabulary.ts`, `project-schema.ts`, `project-checks.ts`, `projects.ts`), `src/content/projects/`, `tests/content-contract.test.ts`

### 4. Design system & UI foundation
The visual language, layout primitives and base components, including the light and dark theme you asked for. Theme belongs here rather than in its own feature, because building it into the components costs very little and retrofitting it means rebuilding them.
**Done when:** `design.md` covers type, colour, spacing and the base components, light and dark both work, and the components handle focus and keyboard use to WCAG 2.2 AA (your target, set 2026-10-13).
- [x] Design it (spec): `/architect design system & UI foundation`
- [x] Build it: `/develop design system & UI foundation`
  - [x] The look, live on every page: fonts, tokens, theme script and toggle, base layout with skip link, header, footer, and the 404 page (AC-4 to AC-13, AC-17, AC-19)
  - [x] The building blocks for pages: Container, Section, Stack, Grid, Button and Prose with dual theme code highlighting (AC-14, AC-15)
  - [x] Polish and the checks: page transitions, favicon, dev only style guide, design contract and build tests, browser tests (AC-1 to AC-3, AC-16, AC-18)
- [x] Verify it: `/check verify design system & UI foundation`

spec [0003](../specs/0003-design-system/index.md) · decided: quiet editorial look in [`design.md`](../../design.md), colour tokens holding both themes through `light-dark()`, device theme plus a remembered toggle, Source Serif 4 and Inter self hosted, typed layout components, a 404 page · code in `src/styles/global.css`, `src/layouts/BaseLayout.astro`, `src/components/`, `src/lib/` (`theme.ts`, `site.ts`, `color.ts`, `design-tokens.ts`), `src/pages/404.astro`, `src/dev/` (style guide, dev only)

### 5. Live on your domain
Get one real page deployed on the domain you own, with the build running automatically. This is the thin end to end slice that proves the stack, the host and the domain all work together, and doing it now means launch day is not the first time you find out.
**Done when:** a real page is reachable on your domain over HTTPS, a push rebuilds and redeploys it, and the running cost is still zero.
- [x] Build it: `/develop live on your domain`
- [x] Verify it: `/check verify live on your domain`

Domain: `toyintest.org` (spec 0001), live at https://toyintest.org since 2026-10-13. Config in `wrangler.jsonc`; verify steps in `docs/specs/0001-stack-architecture/verify.md`.

## Release 1: the thinnest usable whole site

The smallest site a real visitor would actually use and you would actually hand out: they land, understand who you are, see proof of your work, and can reach you. Four pages, finished. This is what the two weeks is for.

Each page feature adds its own link to the header nav (`SITE.nav`) when its page ships; the nav stays empty until then (spec 0003).

### 6. Bio & project write ups
The actual words. A bio, and a write up for each project worth showing. This sits first in the release because it is the critical path: everything on the work page and the home page is waiting on this text, and your editing pass has to fit in the two weeks too.
**Done when:** a bio exists in your voice, each featured project has a complete write up matching the content model, you have edited and approved all of it, and the images you already have are in place.
From spec 0003: also collect your links out (a label and URL for each, for example GitHub, LinkedIn, email), so the site footer stops being empty.
- [x] Build it: `/develop bio & project write ups` (bio in `src/content/bio.md`, entries in `src/content/projects/`)
- [x] Verify it: `/check verify bio & project write ups`

### 7. Home page · done
The page that decides whether a visitor keeps reading. It says who you are, what you do, shows a taste of the proof, and points at one clear next step. It also sets the page patterns the rest of the site follows.
**Done when:** a first time visitor can tell within seconds what you do and who for, the strongest work is visible without scrolling far, there is one obvious call to action, the page works on a phone, and it carries its own title, description and share card.
- [x] Design it (spec): `/architect home page`
- [x] Build it: `/develop home page`
  - [x] Who you are and how to reach you, live: site constants (Home nav link, LinkedIn call to action, footer links), the `HOME` words, share tags in the base layout, `PageIntro` and `CallToAction`, the intro and closing sections (AC-1, AC-2, AC-3, AC-9, AC-10, AC-11, AC-12, AC-13)
  - [x] The proof and the rest of the page: `firstParagraph`, `ProjectCard`, `SelectedWork`, the Selected work and About sections, the style guide entries (AC-4, AC-5, AC-6, AC-7, AC-8, AC-18)
  - [x] The checks: build test for head tags, images and scripts; the home browser tests (above the fold, phone, widths, accessibility); spec 0003 browser tests updated for the non empty nav (AC-6, AC-10, AC-13 to AC-17)
- [x] Verify it: `/check verify home page`

spec [0004](../specs/0004-home-page/index.md) · decided: what you do as the heading, open to roles and contracts, one "Message me on LinkedIn" action (repointed to the contact form later), featured projects as equal cards linking to their own code until feature 9, the first bio paragraph, basic share tags from each page's title and description (image, sitemap and structured data stay with feature 12), and the shared `PageIntro`, `ProjectCard` and `CallToAction` · code in `src/pages/index.astro`, `src/components/` (`PageIntro`, `CallToAction`, `ProjectCard`, `SelectedWork`), `src/lib/` (`home.ts`, `text.ts`, `site.ts`), `src/layouts/BaseLayout.astro`, `tests/build/home-build.test.ts`, `e2e/home.spec.ts`

### 8. Work listing · done
The index of your work. This is the page both of your readers go to first to judge you, so it has to make each project easy to scan and easy to open.
**Done when:** every featured project appears with a title, a one line outcome and an image, the order is deliberate rather than accidental, the empty and loading states look intentional, it works on a phone, and it carries its own title, description and share card.
From spec 0003: design the project card and the tag chip on the design tokens.
From spec 0004: the project card is already built (`ProjectCard`), so this page uses `PageIntro size="page"` and `ProjectCard headingLevel={2}`, adds the tag chip, and adds its `Work` nav link.
- [x] Design it (spec): `/architect work listing`
- [x] Build it: `/develop work listing`
  - [x] The listing, live and linked: the `WORK` words, addresses without a trailing slash, `WorkList`, the `/projects` page with its intro and closing section, the `Work` nav link and the updated nav checks (AC-1 to AC-5, AC-9, AC-10, AC-11)
  - [x] The stack chips: `cardStackLabels`, `showStack` on `ProjectCard`, the style guide entries (AC-6, AC-7, AC-8)
  - [x] The checks: the build test for the page, browser tests for order, columns, chips, widths, accessibility and requests (AC-3, AC-6, AC-10 to AC-14)
- [x] Verify it: `/check verify work listing`

spec [0005](../specs/0005-work-listing/index.md) · decided: `/projects` lists every published project in `order`, three cards per row, the first 5 stack technologies as quiet outlined chips on this page only, one closing call to action, a one line empty state, the `Work` nav link, and addresses without a trailing slash · code in `src/pages/projects/index.astro`, `src/components/` (`WorkList`, `ProjectCard` `showStack`), `src/lib/` (`work.ts`, `projects.ts` `cardStackLabels`, `site.ts` nav), `astro.config.mjs` and `wrangler.jsonc` (no trailing slash), `tests/work-page.test.ts`, `tests/build/work-build.test.ts`, `e2e/work.spec.ts`

### 9. Project detail page · done
The case study itself, built on the structure decided in the content model. This is where a reader finds out how you think, which is the thing a resume cannot show.
**Done when:** each project renders its full write up with images and links to live work or code, the structure reads well for both a hiring reader and a client reader, it works on a phone, and each page carries its own title, description and share card.
From spec 0003: render the case study through `Prose`, and decide how figures inside the Markdown get optimised images.
From spec 0004: make the card title link to `projectPath(id)` and keep the outside link.
From spec 0005: add `src/pages/projects/[slug].astro`, link the card title without a trailing slash, and show the full stack (the cards show only the first five).
- [x] Build it: `/develop project detail page`
  - [x] The case study pages: `src/pages/projects/[slug].astro` from `visibleProjects` and `sortProjects`, the `PROJECT_PAGE` words and `glanceRows`, the intro with the write up's links, the cover, the at a glance panel with the full stack and the headline numbers, the write up through `Prose`, the closing call to action
  - [x] Card titles link to `projectPath(id)` with no trailing slash, and the outside link stays
  - [x] The checks: unit tests for the words and the panel, the build test for every project page, browser tests for card titles to pages, the phone layout, accessibility, widths and target sizes
- [x] Verify it: `/check verify project detail page`

no spec of its own: built on spec [0002](../specs/0002-content-model/index.md) (Value sourcing), with figures in the write up optimised by Astro's own Markdown image pipeline (a relative `![alt](./x.png)`, wrapped in `<figure>` with a `<figcaption>` for a caption) · code in `src/pages/projects/[slug].astro`, `src/lib/project-page.ts`, `src/components/ProjectCard.astro`, `tests/build/project-build.test.ts`, `e2e/project.spec.ts`

### 10. About page · done
The longer version of who you are, plus the resume download. The resume is cheap to add here and uses content you already have, so it does not need its own feature.
**Done when:** the page tells your story in your voice, the resume downloads correctly, your links out are present, it works on a phone, and it carries its own title, description and share card.
From spec 0004: add a "More about me" link to the home About section, and the `About` nav link.
- [x] Build it: `/develop about page`
  - [x] The page: `/about` with the `ABOUT` words, the whole bio imported from `src/content/bio.md` through `Prose`, the resume button (`Button download`), the links out from `SITE.links`, the closing call to action, the phone layout
  - [x] Reaching it: the `About` nav link in `SITE.nav`, and "More about me" in the home About section
  - [x] The checks: unit tests for the words, the page and the nav; the build test; browser tests for content, download, phone layout, headings and requests, with `/about` added to the shared width, axe and target size lists
  - [x] The resume button hides itself while `public/toyin-ogunseinde-cv.pdf` is missing (board decision, 2026-10-14: ship without it); dropping the cleaned PDF in brings it back with no code change, and the build and browser checks cover both states (the file: JSM-44)
- [x] Verify it: `/check verify about page`

no spec of its own: built on spec [0004](../specs/0004-home-page/index.md) (`PageIntro`, `CallToAction`, `BaseLayout` share tags) and `design.md` · code in `src/pages/about.astro`, `src/lib/about.ts`, `src/components/Button.astro` (`download`), `src/lib/site.ts` (nav), `src/pages/index.astro` (More about me), `tests/about-page.test.ts`, `tests/build/about-build.test.ts`, `e2e/about.spec.ts`

### 11. Contact form · Beta · done
The point of the whole site. A visitor sends you a message without leaving the page. Tagged for extra rigor because it is the one feature that can fail silently: a broken form loses you work and says nothing, and it is also the only place the site handles someone else's personal data.
**Done when:** a submitted message reliably reaches you, the sender sees a clear success or failure, bad input and spam are handled, the form is usable by keyboard, and a delivery failure is visible rather than silent.
From spec 0004: change `SITE.contact` to `/contact` with a new label, and revisit `HOME.closingText`.
From spec 0005: revisit `WORK.closingText` alongside `HOME.closingText`.
From spec 0006: the deferred Privacy note and Error monitoring ship with this feature; before the build merges, you set up Email Routing, the Turnstile widget, the `CONTACT_OUTBOX` KV namespace and secrets, and a Healthchecks.io check (the spec's Follow-up).
- [x] Design it (spec): `/architect contact form`
- [x] Build it: `/develop contact form`
  - [x] A message reaches you, with a 30 day copy: `src/lib/contact.ts` (words, validation, outcomes, email text), the Worker for `/api/*` (exit table, KV copy, `send_email`, Turnstile, rate limit, one log line), `wrangler.jsonc` and the contract test, the Worker tooling in `build`, the `/contact` page and form, `SITE.contact` and the Contact nav link (AC-1 to AC-20, AC-22, AC-24)
  - [x] You hear when it breaks: the Monday self check, the Turnstile secret probe, the week's message list and the Healthchecks.io pings (AC-21)
  - [x] The checks and the design record: `design.md` form rows and the style guide, page and build tests, the browser tests with stubbed endpoint and Turnstile, the generated types check in CI (AC-1 to AC-3, AC-6 to AC-8, AC-11, AC-19, AC-20, AC-23, AC-24)
- [x] Verify it: `/check verify contact form` (includes the local `wrangler dev` proof and the real Turnstile challenge by keyboard)
- [x] Test it: `/test contact form`

spec [0006](../specs/0006-contact-form/index.md) · decided: `/contact` posts in place to a Worker script that runs only for `/api/*` (no adapter, pages stay free), a 30 day KV copy then a free `send_email` to your verified inbox, Turnstile and 3 sends a minute, honest sent, not sent and uncertain messages that keep the text, an inline privacy note, a Monday self check plus a Healthchecks.io alarm, "Send me a message" to `/contact` and a Contact nav link · code in `src/pages/contact.astro`, `src/components/ContactForm.astro`, `src/lib/contact.ts`, `src/lib/site.ts`, `worker/` (`index.ts`, `contact.ts`, `turnstile.ts`, `weekly.ts`), `wrangler.jsonc`, `tests/contact-page.test.ts`, `tests/build/contact-build.test.ts`, `e2e/contact.spec.ts`

### 12. Search metadata & share cards · done
So your name finds your site, and so a pasted link looks deliberate rather than broken. You will share this link a lot, in applications and in messages, and the preview is often the first thing anyone sees of your work.
**Done when:** every page has a title and description, a sitemap exists, structured data describes you as a person, and pasting any page link into a message shows a correct title, description and image.
From spec 0004: build on the share tags already in `BaseLayout` (title and description), adding the image, sitemap and structured data, and decide the share image for each page.
From spec 0005: decide eager loading for the covers above the fold, and write sitemap addresses without a trailing slash.
- [x] Design it (spec): `/architect search metadata & share cards`
- [x] Build it: `/develop search metadata & share cards`
  - [x] Every pasted link shows an image: the site card source image, `src/lib/seo.ts` with `getImage` in `BaseLayout`, the project cover passed from the project page, the 404 page's `NOT_FOUND` words and `noindex` (AC-1 to AC-8)
  - [x] Search engines find the pages and know who you are: `@astrojs/sitemap`, the sitemap link, the `robots.txt` endpoint, `SITE.jobTitle` and `SITE.country`, and the Person and WebSite data block on the home page (AC-9 to AC-11, AC-13, AC-14)
  - [x] The main image loads first: `priority` on `ProjectCard` for the first card on home and work, and on the project page cover (AC-15)
  - [x] The checks and the design record: `tests/build/seo-build.test.ts`, the updated home, about, work and 404 tests, the stack contract, the `design.md` Share card row and the style guide (AC-1 to AC-11, AC-13 to AC-16)
- [x] Verify it: `/check verify search metadata & share cards` (includes the live `robots.txt` and sitemap checks and the LinkedIn Post Inspector and message app paste, AC-12, AC-17)

spec [0007](../specs/0007-search-metadata-share-cards/index.md) · code in `src/lib/seo.ts`, `src/layouts/BaseLayout.astro`, `src/pages/robots.txt.ts`, `src/assets/share/` · decided: share images from Astro's own image step at build time (each project page its cover, every other page one site card drawn like the covers, 1200 by 630 JPEG), `@astrojs/sitemap`, a `robots.txt` that allows every crawler and keeps `/api/` out, WebSite and Person data on the home page only, one priority cover per page, `noindex` on the 404 page

## Release 2: make the case stronger

The site is already live and usable at this point. These two make it more persuasive, especially for the contracting half of your audience.

### 13. Services & how you work · needs a decision
What you offer and how an engagement actually runs. This needs a real decision from you about rates and engagement models before it can be built, which is why it is flagged.
**Done when:** a prospective client can tell what you offer, roughly what it costs or how pricing works, and what working with you looks like.
- [ ] Design it (spec): `/architect services & how you work`

### 14. Testimonials
Other people vouching for you, which persuades in a way your own words cannot. Worth knowing the build is the easy half here: collecting the quotes is on you and depends on other people replying.
**Done when:** real quotes are displayed with attribution, and the section looks intentional rather than sparse when there are only one or two.
- [ ] Build it: `/develop testimonials`
- [ ] Verify it: `/check verify testimonials`

## Release 3: publishing

Only worth starting when you actually intend to publish. You have no posts written yet, so these would ship empty today, which is why they sit last.

### 15. Blog · needs a decision
A place to publish writing. The decision is the authoring and publishing pipeline, which is a real choice and not just a page.
**Done when:** you can write and publish a post without touching unfamiliar machinery, posts list and read well, and each post carries its own metadata and share card.
- [ ] Design it (spec): `/architect blog`

### 16. Newsletter signup · needs a decision
Collecting email addresses so you can send something later. Flagged because it means storing other people's personal data, which pulls in a provider choice and a consent decision. Only build this if you genuinely intend to send a newsletter, otherwise it is a dead form.
**Done when:** a visitor can subscribe and gets confirmation, addresses are stored somewhere you control, and unsubscribing works.
- [ ] Design it (spec): `/architect newsletter signup`

## Deferred
Out of scope for the current build pass, kept so the plan stays honest. The first three are things you chose not to include (the accessibility target left this list on 2026-10-13 when you set WCAG 2.2 AA in spec 0003; the privacy note, and error monitoring further down, shipped with feature 11 on 2026-10-14); they are listed here with the consequence so the choice stays visible rather than quietly disappearing.
- **Visitor analytics**: without it there is no way to tell whether anyone reaches the contact form, which is the one number that says whether this site is doing its job · needs a decision
- **Privacy note**: shipped with feature 11, as the note under the contact form (spec 0006, AC-22). The newsletter, if built, needs its own
- **Speed target**: no stated Core Web Vitals number, so speed stays a hope rather than a constraint
- **Error monitoring**: shipped with feature 11, for the contact form only: the Monday self check email and the Healthchecks.io alarm (spec 0006, AC-18, AC-21)
- **Content Security Policy**: none today; if one is added, it must allow the inline theme script by its hash (spec 0003), and `https://challenges.cloudflare.com` for scripts and frames on `/contact` (spec 0006), or the theme and the form break
- **Editing content without code**: a real convenience later, but a significant decision and cost for a site whose content changes a few times a year · needs a decision

## Legend

**The decision box.** Every feature carries exactly one, the sub task whose label ends with `(spec)`. Its wording varies (`Design it (spec)` normally, `Decide the stack (spec)` on Stack & architecture), so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | **`/architect` at spec capture** | `Design it` ticked; spec linked; `Build it: /develop <feature>` + **2 to 5 milestones**; the tier's closing boxes (`Verify it` Alpha+, `Test it` Beta+) |
| `in-progress` (building) | `/develop` | milestone sub boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/check verify` | `Build it` + milestones ticked; `Verify it` ticked |
| `done` | **you, when you decide it is**; `/sync` reconciles | boxes you ran ticked, skipped ones marked skipped; at `Alpha` the suggested point to call it done is after `/check verify` |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise straight to `/develop` (or `/audit` for standards & tooling). The tag drops once the spec is captured.
- **Atomic build tasks live in the spec's `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (pre workflow) and `dropped` (de scoped, kept for history).
- **Workflow tier tag** beside a heading (e.g. `· Beta`) sets that one feature's rigor above or below the project default; no tag inherits `Alpha`.
- **Workflow** (header line) is the project default, what runs after `/develop`: **Alpha** = `/check verify` on the real running site.
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.

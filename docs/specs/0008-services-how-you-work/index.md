# 0008. Services and how you work

**Date**: 2026-10-14
**Status**: Accepted

## Summary

A new `/services` page, linked as `Services` in the header, tells a prospective client what you offer, how a project with you runs, and how pricing works. It lists five offers, each tied to keys of the `SERVICES` vocabulary (the fixed list of work types a project write up can carry), and under each offer a short "Seen in" line links to up to three of your projects tagged with those keys, so the proof updates itself as write ups change. Pricing names your two ways of working (a day rate, or a fixed price for a scoped project) with no figures, and the page ends with the usual "Send me a message" call to action. Every word sits in one `SERVICES_PAGE` constant with a length test, like every other page.

## Requirements

**User stories**:
- As a prospective client, I want to see the kinds of work you take on, in my words rather than a tool list, so that I know within a minute whether my problem fits.
- As a prospective client, I want each offer to point at real work you did, so that I can check the claim instead of trusting it.
- As a prospective client, I want to know how a project starts, runs and ends, and how you price it, so that writing to you feels low risk.
- As a hiring reader, I want the page to show range without a public rate, so that it reads as a strength rather than a price tag.
- As the site owner, I want the words in one place and the proof drawn from my write ups, so that a new project shows up under the right offer with no extra step.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: `src/pages/services.astro` builds `dist/services/index.html`. Inside `<main>` there is one `Container width="measure"`. Its first child is a `PageIntro` with `size="page"`, `eyebrow={SERVICES_PAGE.availability}`, `heading={SERVICES_PAGE.heading}` (the page's only `<h1>`) and `lead={SERVICES_PAGE.lead}`, with `<CallToAction class="w-full sm:w-auto sm:self-start" />` in its slot.
- **AC-2**: Every word on the page lives in the `SERVICES_PAGE` constant in `src/lib/services.ts`, starting from the draft copy in *Feature design*. A Vitest test (`src/lib/services.test.ts`) checks, after trimming, that every string (including each offer, step and pricing model field) is non empty and within its limit: `title` at most 60 characters, `description` 50 to 160, `availability` at most 80, `heading` at most 60, `lead` at most 160, `offersHeading`, `stepsHeading`, `pricingHeading` and `closingHeading` at most 40, `proofLabel` at most 20, each offer `name` at most 50 and `summary` at most 160, each step `title` at most 40 and `text` at most 140, each pricing model `title` at most 30 and `text` at most 140, `pricingNote` at most 160, `closingText` at most 120. No string contains the word `LinkedIn`. No pricing string (`pricingHeading`, each model `title` and `text`, `pricingNote`) contains a digit or a currency sign (`€`, `$`, `£`), which holds the "no figures" decision.
- **AC-3**: `SERVICES_PAGE.offers` holds exactly five offers in this order, with these ids and keys: `platforms` (`infrastructure`, `platform-engineering`), `delivery` (`ci-cd`), `monitoring` (`observability`), `security` (`security`), `tools` (`backend`, `api-design`, `frontend`). Each offer's `services` is a non empty list typed as `ServiceKey`, so an unknown key fails the type check. The test checks that ids are unique and that every key of `SERVICES` in `src/lib/vocabulary.ts` appears in exactly one offer, so adding a key to the vocabulary fails the test until you place it in an offer.
- **AC-4**: `offerProof(offer, projects)` in `src/lib/services.ts` is pure: from a list already filtered and sorted by the spec 0002 helpers, it returns, in the given order, the projects whose `data.services` shares at least one key with `offer.services`, at most `PROOF_LIMIT` of them, where `PROOF_LIMIT` is an exported constant `3`. It never mutates its input and returns an empty list when nothing matches. With today's published projects in `order` it returns: `platforms` → Production Kubernetes on Hetzner Cloud, Deployer; `delivery` → ShipSafe; `monitoring` → Production Kubernetes on Hetzner Cloud; `security` → Production Kubernetes on Hetzner Cloud, Deployer, ShipSafe; `tools` → Deployer, Mool.
- **AC-5**: `src/components/OfferList.astro` takes `heading`, `proofLabel` and `offers` (each offer with its resolved `proof` list) and renders a `Section` with `id="offers"` and the `<h2>` heading, holding a `<ul>` with one `<li>` per offer in the given order. Each `<li>` holds an `<h3>` with the offer `name`, a `<p class="max-w-measure">` with the `summary`, and, only when `proof` is non empty, the "Seen in" line: a `<p>` with the text `proofLabel` and, after it, a `<ul aria-label="{proofLabel}: {name}">` with one `<li>` per project holding `<a href={projectPath(project.id)}>{project.data.title}</a>`. With an empty `proof` the `<li>` has no label and no inner list. The page passes `SERVICES_PAGE.offersHeading`, `SERVICES_PAGE.proofLabel`, and `SERVICES_PAGE.offers` mapped with `offerProof` over `sortProjects(visibleProjects(await getCollection('projects'), { includeDrafts: import.meta.env.DEV }))`.
- **AC-6**: After the offers, a `Section` with `id="how"` and the `<h2>` `SERVICES_PAGE.stepsHeading` holds an `<ol>` with five `<li>` in the order of `SERVICES_PAGE.steps`, each with an `<h3>` step `title` and a `<p class="max-w-measure">` step `text`. The step numbers 1 to 5 show as the list's own markers (`list-decimal`, markers in `muted`), not as text in the words.
- **AC-7**: After the steps, a `Section` with `id="pricing"` and the `<h2>` `SERVICES_PAGE.pricingHeading` holds a `<ul>` with one `<li>` per entry of `SERVICES_PAGE.pricing` (Day rate, then Fixed price), each with an `<h3>` `title` and a `<p class="max-w-measure">` `text`, then one `<p class="max-w-measure">` with `SERVICES_PAGE.pricingNote`. The built page's pricing section contains no digit and no currency sign.
- **AC-8**: The last section in `<main>` is a `Section` with `id="contact"` and the `<h2>` `SERVICES_PAGE.closingHeading`, holding (inside a `Stack`) a `<p class="max-w-measure">` with `SERVICES_PAGE.closingText` and then `<CallToAction class="w-full sm:w-auto sm:self-start" />`. Inside `<main>` there are exactly two links to `SITE.contact.href` (the intro and the closing section) and no other primary `Button`. `CallToAction` and `SITE.contact` are unchanged.
- **AC-9**: `SITE.nav` is Home (`/`), Work (`/projects`), Services (`/services`), About (`/about`), Contact (`/contact`), in that order. On `/services`, Services carries `aria-current="page"` and no other link does; on every other page Services carries none. At 640 pixels the wordmark, the five links and the theme toggle sit on one header row with the wordmark on one line; at 639 pixels the links move to a second row. If the build finds the five links do not fit one row at 640 pixels, the header switches its one row layout from `sm` to `md` (two rows below 768, one row from 768) in `SiteHeader.astro`, and the header rows test and `design.md` change to 767 and 768 to match; the build records which case held in its pull request. The checks that list the nav are updated: `src/lib/site.test.ts` (nav value), and in `e2e/design-system.spec.ts` the keyboard order, the header rows test and the current link test (`/services` added to both its link map and its path list).
- **AC-10**: The page `<title>` is `SERVICES_PAGE.title` and its meta description is `SERVICES_PAGE.description`, passed to `BaseLayout`, which writes the spec 0007 share tags with the site card image. The canonical link and `og:url` are `https://toyintest.org/services`. The page passes no `noindex` and no `structuredData`, and `dist/sitemap-0.xml` lists `https://toyintest.org/services`.
- **AC-11**: The page passes the spec 0003 width sweep (no sideways scroll at 320, 360, 375, 639, 640, 768, 1024 and 1440 pixels) through the shared path list. Below 640 pixels both call to action buttons fill the content width; from 640 up they have their natural width. A long project title in a "Seen in" line wraps inside the reading column.
- **AC-12**: The page has exactly one `<h1>`; headings go h1, then h2 per section, with h3 only inside the offers, steps and pricing sections, without skipping a level. The spec 0003 `@axe-core/playwright` WCAG 2.2 AA scan reports zero violations in both themes, and every link and button on the page, including each "Seen in" link, is at least 24 by 24 CSS pixels (or the spacing exception applies). `/services` joins the shared path lists of the axe and target size tests.
- **AC-13**: The page adds no JavaScript, no dependency and no outside request: `dist/services/index.html` holds only the two spec 0003 scripts, has no `<img>` in `<main>`, and loading it requests nothing from another host.
- **AC-14**: A draft project never appears in a "Seen in" line in the production build: the proof is drawn only from `visibleProjects` with `includeDrafts: import.meta.env.DEV`. On the dev server a draft may appear, as on every other page.
- **AC-15**: `design.md` gains a Services page row in its Components table and a `### Services page` section with the values in *Feature design*, and the dev only style guide shows `OfferList` with one offer that has proof and one that has none, with `src/dev/styleguide.test.ts` extended to match.

## Decision

**Chosen option**: Option 1: a `/services` page built from the existing page parts, five offers grouped over the `SERVICES` vocabulary with a derived "Seen in" line, pricing as models with no figures, and the words in one `SERVICES_PAGE` constant.

`src/pages/services.astro` assembles `PageIntro`, a new `OfferList`, a steps section, a pricing section and a closing `Section` with `CallToAction`. The words and the offers live in `SERVICES_PAGE` (`src/lib/services.ts`), the proof rule in `offerProof` beside it, and the nav gains `Services`. No new tool, dependency or server code.

**Implementation skills**: none beyond the project's own rules; `jdevalk/skills` astro-seo (spec 0007) needs no change because `BaseLayout` already writes the tags and `@astrojs/sitemap` lists the page.

## Feature design

**Data model sketch**: no persisted data. Constants and the existing `projects` collection:

| Name | Where | Shape | Rules |
|---|---|---|---|
| `ServiceOffer` | `src/lib/services.ts` | `{ readonly id: string; readonly name: string; readonly summary: string; readonly services: readonly [ServiceKey, ...ServiceKey[]] }` | ids unique; every `SERVICES` key in exactly one offer (AC-3) |
| `EngagementStep` | `src/lib/services.ts` | `{ readonly title: string; readonly text: string }` | five, in order (AC-6) |
| `PricingModel` | `src/lib/services.ts` | `{ readonly title: string; readonly text: string }` | two, no figures (AC-2, AC-7) |
| `SERVICES_PAGE` | `src/lib/services.ts` | `ServicesCopy`: `title`, `description`, `availability`, `heading`, `lead`, `offersHeading`, `proofLabel`, `offers: readonly ServiceOffer[]`, `stepsHeading`, `steps: readonly EngagementStep[]`, `pricingHeading`, `pricing: readonly PricingModel[]`, `pricingNote`, `closingHeading`, `closingText`, all `readonly` | limits in AC-2; you edit the words here |
| `PROOF_LIMIT` | `src/lib/services.ts` | `3` | the one place the proof count lives |
| `SITE.nav` | `src/lib/site.ts` | `readonly NavItem[]` | gains Services after Work (AC-9) |
| Projects | the `projects` collection (spec 0002) | `Project` | read only through `visibleProjects`, `sortProjects`, `projectPath`, and `offerProof`; `services` is already a non empty list of known keys (spec 0002) |

Relationship: an offer covers one or more `SERVICES` keys (1 to N); a project carries one or more keys (spec 0002); an offer's proof is every visible project sharing a key, first three in `order`. Nothing is stored; the link is computed at build time.

**Draft copy** (the starting `SERVICES_PAGE` values; you may edit them in the build's pull request before it merges):

| Key | Draft |
|---|---|
| `title` | Services by Toyin Ogunseinde, DevOps engineer |
| `description` | Kubernetes platforms, delivery pipelines, monitoring and security work by Toyin Ogunseinde, with how a project runs and how pricing works. |
| `availability` | Remote, for clients in the Netherlands and the EU, a few projects at a time |
| `heading` | Services |
| `lead` | What I can build or fix for your team, how a project with me runs, and how I price it. |
| `offersHeading` | What I offer |
| `proofLabel` | Seen in |
| `stepsHeading` | How working with me goes |
| `pricingHeading` | Pricing |
| `pricingNote` | Every quote comes after the free call, in writing, before any work starts. |
| `closingHeading` | Have a project in mind? |
| `closingText` | Tell me about the project, and I will get back to you. |

Offers (`id`, `name`, `summary`, `services`):

| id | name | summary | services |
|---|---|---|---|
| `platforms` | Kubernetes platforms as code | Clusters described entirely in Terraform and Git, rebuilt with one command, with nothing changed by hand. | `infrastructure`, `platform-engineering` |
| `delivery` | Delivery pipelines and GitOps | CI checks and deploys that run from Git, so shipping is routine and every change can be traced and rolled back. | `ci-cd` |
| `monitoring` | Monitoring and alerting | Metrics, dashboards and alerts that tell you something is wrong before your users do. | `observability` |
| `security` | Security reviews and hardening | A review of your cluster, pipeline or app, then the fixes: least access, network rules, and secrets kept out of code. | `security` |
| `tools` | Backend services and internal tools | The services and tools around your platform, written in Go or TypeScript. | `backend`, `api-design`, `frontend` |

Steps (`title`, `text`):

1. Send me a message · Tell me what you are running, what hurts, and when you need it fixed.
2. A free 30 minute call · We talk through the problem, and I tell you honestly whether I am the right person for it.
3. A written proposal · You get the scope, the price and a timeline in writing before any work starts.
4. The work · I work in your repositories, with a short written update every week, so nothing is a surprise.
5. Handover · Documentation and a walkthrough, so your team owns what I built.

Pricing (`title`, `text`):

- Day rate · For open ended work and ongoing help, billed for the days I work (time and materials).
- Fixed price · For a clearly scoped project, one agreed price, set in the written proposal.

**Page composition** (top to bottom, inside one `<Container width="measure">`):

1. `PageIntro size="page"` with the availability eyebrow, the heading, the lead, and `CallToAction` in the slot.
2. `OfferList` (`id="offers"`): the five offers, each with its "Seen in" line when it has proof.
3. `Section id="how"`: the five steps as a numbered list.
4. `Section id="pricing"`: the two models, then the note.
5. `Section id="contact"`: closing heading, text and `CallToAction`.

**Component values** (the build adds these to `design.md`):

| Part | Values |
|---|---|
| Offer list | an unbulleted `<ul>` with `Stack` rhythm between offers (gap `2rem`). Offer name `<h3>` at `--text-xl` Source Serif 4; summary at `--text-base` in `text` |
| Seen in line | below the summary: the label as a `<p>` at `--text-sm` Inter in `muted`; the links as a `<ul>` with `flex flex-wrap gap-x-4 gap-y-1`, each link `inline-flex min-h-6 items-center text-sm`, normal link colours, no chip border; titles wrap rather than truncate |
| Steps | an `<ol class="list-decimal pl-6">` with markers in `muted`, step `<h3>` at `--text-lg` Inter 600, text at `--text-base`, `1.5rem` between steps |
| Pricing | an unbulleted `<ul>`, model `<h3>` at `--text-lg` Inter 600, text at `--text-base`; the note after it in `muted` |
| Header | unchanged values; five nav links (AC-9 decides `sm` or `md` for the one row layout) |

**Phone layout**: one column throughout, the reading column at `measure`. Header on two rows (wordmark and toggle, then the five links, wrapping if needed). Both call to action buttons fill the width below `sm`. "Seen in" links wrap onto as many lines as they need.

**API surface** (pure helpers, components and the page; no endpoints):

| Name | Signature or props | Returns or renders | Notes |
|---|---|---|---|
| `SERVICES_PAGE` | `ServicesCopy` | constant | AC-2, AC-3 |
| `PROOF_LIMIT` | `3` | constant | exported |
| `offerProof` | `(offer: ServiceOffer, projects: readonly Project[]) => readonly Project[]` | up to `PROOF_LIMIT` projects sharing a key, given order | AC-4; expects the list from `sortProjects(visibleProjects(…))` |
| `OfferList` | `{ heading: string; proofLabel: string; offers: readonly (ServiceOffer & { readonly proof: readonly Project[] })[] }` | `Section id="offers"` per AC-5 | `src/components/OfferList.astro`, documented `Props`, testable with the container API like `WorkList` |
| `/services` | static page | AC-1, AC-5 to AC-8, AC-10 | `src/pages/services.astro` |
| `SITE.nav` | `readonly NavItem[]` | constant | AC-9 |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Intro | eyebrow, heading, lead | `SERVICES_PAGE.availability`, `.heading`, `.lead` (board answer: remote, NL and EU, a few projects at a time) |
| Intro and closing | button label and target | `SITE.contact` through `CallToAction` (spec 0004, spec 0006; board answer: reuse unchanged) |
| Offers | which offers, their order, names, summaries | `SERVICES_PAGE.offers` (board answer: the five offers; draft words in this spec) |
| Offers | which vocabulary keys each covers | `SERVICES_PAGE.offers[].services`, typed `ServiceKey` from `src/lib/vocabulary.ts` (AC-3) |
| Seen in | which projects, in what order, how many | `offerProof(offer, sortProjects(visibleProjects(getCollection('projects'), { includeDrafts: import.meta.env.DEV })))`: shared key with `project.data.services`, the write ups' `order`, at most `PROOF_LIMIT` (3) |
| Seen in | link text and address | `project.data.title` and `projectPath(project.id)` (spec 0002, feature 9) |
| Seen in | label and list name | `SERVICES_PAGE.proofLabel`; the list's `aria-label` is `` `${proofLabel}: ${offer.name}` `` |
| Steps | titles, texts, numbers | `SERVICES_PAGE.steps` (board answer: five steps); numbers from the `<ol>` markers |
| Pricing | models, texts, note | `SERVICES_PAGE.pricing`, `.pricingNote` (board answer: day rate and fixed price, no figures) |
| Closing | heading, text | `SERVICES_PAGE.closingHeading`, `.closingText` |
| Header | Services link, current marker | `SITE.nav`, `isCurrentPath` (spec 0003) |
| Head | title, description, share image, canonical | `SERVICES_PAGE.title`, `.description` via `BaseLayout`; the site card image and canonical from spec 0007 |
| Sitemap | the page's entry | `@astrojs/sitemap` (spec 0007), automatic |
| Tests | fixture projects | the spec 0004 minimal `Project` fixture with chosen `services` lists, for `offerProof` (match, no match, more than 3 matches, order kept) and `OfferList` (proof and no proof) |
| Style guide | example offers | `SERVICES_PAGE.offers` entries `platforms` (with its real proof) and one with `proof: []` |

**Key invariants**:
- Every `SERVICES` key belongs to exactly one offer; offers name only known keys.
- The proof line is derived, never written by hand: no page or component filters projects by service itself, only through `offerProof`, which takes the spec 0002 helpers' output.
- A project shows on this page only as a name link to its project page, never as a card or a summary. This is the one place outside `ProjectCard` and the project page where a project is referenced; the reference is its title and its `projectPath`.
- One contact target, `SITE.contact`, shown only through `CallToAction`.
- The page never shows a price figure.
- The nav entry ships in the same change as the page, so the site never links to a missing page.
- One `<main>`, one `<h1>`; no new JavaScript, dependency or outside request.

**Security model**: a public, read only static page showing only what you chose to publish. No form, no stored data, no visitor data. Draft write ups stay out of the production build through `visibleProjects`. No compliance scope.

**Critical test scenarios** (each maps to an acceptance criterion in *Requirements*):
- Happy path: the production `/services` shows the intro with the button, five offers with their "Seen in" links as listed in AC-4, five numbered steps, two pricing models and the note, and the closing button, verifies **AC-1**, **AC-4** to **AC-8**
- Failure case: an offer whose keys match no visible project shows its name and summary with no label and no empty list, verifies **AC-5**
- Words: limits, no `LinkedIn`, no digit or currency sign in pricing, verifies **AC-2**, **AC-7**
- Vocabulary: unique ids; every `SERVICES` key in exactly one offer (a test adding a fake key to a copy of the map fails), verifies **AC-3**
- Proof helper: match, no match, cap at 3, order kept, input left unchanged, verifies **AC-4**
- Drafts: a draft fixture project never reaches `offerProof`'s input in production, verifies **AC-14**
- Nav: Services current only on `/services`; keyboard order; one header row at 640 (or 768 under the fallback), verifies **AC-9**
- Head and sitemap: title, description, site card image, canonical `https://toyintest.org/services`, sitemap entry, no JSON-LD, verifies **AC-10**
- Layout and accessibility: width sweep, button widths, heading order, axe in both themes, target sizes, verifies **AC-11**, **AC-12**
- Budget: two scripts, no images in main, no outside requests, verifies **AC-13**
- Auth/permission: not applicable; a public static page with no protected surface.

## Build plan

Skateboard: the first milestone alone ships a page a client can read, reachable from the header (offers, steps, pricing and a way to reach you); the second adds the proof that ties each offer to your work; the third locks it in with the design record and the build and browser checks.

**Milestone 1: the page, live and linked**
1. Create `src/lib/services.ts` (`ServiceOffer`, `EngagementStep`, `PricingModel`, `ServicesCopy`, `SERVICES_PAGE` with the draft copy) and `src/lib/services.test.ts` for the limits, the `LinkedIn` rule, the no figures rule, unique ids and every `SERVICES` key in exactly one offer, satisfies **AC-2**, **AC-3**
2. Build `src/components/OfferList.astro` with documented `Props`, rendering offers with an empty `proof` for now, and container tests in `src/components/` beside the other component tests, satisfies **AC-5**
3. Create `src/pages/services.astro` (intro with `CallToAction`, `OfferList`, the steps and pricing sections, the closing section) and `tests/services-page.test.ts`, mocking `astro:content` like `tests/work-page.test.ts` and rendering with the request URL `http://localhost:4321/services`; it checks title, description, one h1, section order and ids, five steps, two pricing models, and exactly two contact links, satisfies **AC-1**, **AC-6**, **AC-7**, **AC-8**, **AC-10**
4. Add `{ label: 'Services', href: '/services' }` after Work in `SITE.nav`; update `src/lib/site.test.ts`, and in `e2e/design-system.spec.ts` the keyboard order, the header rows test and the current link test; add `/services` to the shared path lists of the width sweep, axe and target size tests. Run the header rows test at 639 and 640; if five links do not fit one row at 640, apply the AC-9 fallback (`sm` to `md` in `SiteHeader.astro`, test at 767 and 768) and say so in the pull request, satisfies **AC-9**, **AC-11**, **AC-12**

**Milestone 2: the proof**
5. Add `PROOF_LIMIT` and `offerProof` to `src/lib/services.ts` with tests (match, no match, cap, order, no mutation), satisfies **AC-4**
6. Render the "Seen in" line in `OfferList` and extend its container tests (proof and no proof, link text and `projectPath` address, the list's `aria-label`); have the page map `SERVICES_PAGE.offers` with `offerProof` over `sortProjects(visibleProjects(…))`, satisfies **AC-5**, **AC-14**

**Milestone 3: the design record and the checks**
7. Add the Services page row and `### Services page` section to `design.md`, update its header note if the AC-9 fallback applied, and add `OfferList` (with proof and without) to the dev style guide with `src/dev/styleguide.test.ts` extended, satisfies **AC-15**
8. Add `tests/build/services-build.test.ts`: `dist/services/index.html` exists; title, description, canonical and `og:url`, the site card `og:image`, no JSON-LD; the five offer names in order with the "Seen in" titles from AC-4 linking to `/projects/<id>`; five steps; no digit or currency sign in `#pricing`; only the two spec 0003 scripts; no `<img>` in main; the sitemap lists `/services`, satisfies **AC-4**, **AC-7**, **AC-10**, **AC-13**, **AC-14**
9. Add `e2e/services.spec.ts`: content order, button widths below and above 640, "Seen in" links wrapping inside the column at 320, heading order, a "Seen in" link opening its project page, no third party requests (current link, axe, target sizes and the width sweep come from the shared lists, step 4), satisfies **AC-11**, **AC-12**, **AC-13**

## Consequences

**Positive**:
- A client finds what you offer, how it runs and how it is priced on one page you can send as a single link.
- The proof maintains itself: tag a new write up with a work type and it appears under the matching offer.
- Tying offers to the vocabulary means the work types on project pages and the offers on this page cannot drift apart unnoticed.
- No new tool, dependency or running cost; the page is a free static asset like the rest.

**Negative / tradeoffs**:
- No figures means some clients write to you who cannot afford you; the free call absorbs that cost.
- The "Seen in" links use full write up titles, which are long ("Deployer, a deploy platform for AI coding agents"), so the line wraps on phones. A short name field would fix it but changes the spec 0002 schema and every write up.
- Security proof is the same three projects as platforms, because every project carries `security`; the line reads repetitive until more varied work is written up.
- The fifth offer (backend services and internal tools) widens the pitch beyond DevOps, which a hiring reader looking for a specialist may read as less focused.
- Five nav links may not fit one header row at 640 pixels; the fallback keeps two rows up to 768, a small change to every page's header on tablets.
- A promise on the page ("a short written update every week", "a free 30 minute call") is a commitment you must keep.

**Neutral**:
- Spec 0004's rule that pages show projects only through `ProjectCard` now has one stated exception: a name link to the project page here. `/sync` should reword that line in `CLAUDE.md` when this ships.
- The home page is unchanged; the page is reached through the nav.
- No structured data for services: spec 0007 keeps JSON-LD on the home page only.

## Follow-up

- [ ] Before the build's pull request merges, edit the draft words in `src/lib/services.ts` until they sound like you, and confirm you are happy to promise the free 30 minute call and the weekly update.
- [x] When this ships, `/sync` rewords the `CLAUDE.md` page building blocks line to allow the "Seen in" name links, and adds `SERVICES_PAGE` in `services.ts` to the page words list.
- [ ] Optional later: a starting day rate, if clients who cannot afford you become a real cost (one string and a change to the no figures rule in AC-2).

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

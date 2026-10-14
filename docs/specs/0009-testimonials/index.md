# 0009. Testimonials

**Date**: 2026-10-14
**Status**: Proposed

## Summary

Quotes from past colleagues, managers and clients live in a new `testimonials` content collection: one small YAML file per quote in `src/content/testimonials/`, checked by a strict schema when the site builds, the same way project write ups are. Each quote carries the person's full name, role and company, an optional link to a public profile they chose to share, an optional project id (spec 0002) so it can sit beside the work it is about, and a required record of when and how they said yes to publishing it. No contact details are allowed. The home page shows up to three quotes, stacked large in the reading column, right after Selected work, and a project page shows the quotes that point at it. With no quotes (today) neither section renders at all, so the build can ship now and the feature counts as done once the first real quote is added.

## Requirements

**User stories**:
- As a hiring reader, I want to read what people who worked with you say, with their name, role and company, so that I trust the claims on the page more than your own words.
- As a prospective client, I want a quote about a project to sit beside that project, so that I see someone vouching for the exact work I am reading about.
- As the site owner, I want to add a quote by dropping one small file into a folder, with the build stopping me if anything is missing or wrong, so that a quote never goes up without the person's yes or with broken attribution.
- As someone who gave a quote, I want none of my contact details in a public repository, so that saying yes costs me nothing.
- As any visitor, I want the section to look deliberate with one or two quotes and to be absent with none, so that the site never looks unfinished.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

*Content and checks*
- **AC-1**: `src/content.config.ts` defines a `testimonials` collection loaded from `./src/content/testimonials` with the pattern `*.yaml`. Each entry's id is its file name without `.yaml`, exactly as written. The folder exists in the repository today holding only a `.gitkeep`, so the collection is empty and the build passes.
- **AC-2**: The schema `testimonialSchema` in `src/lib/testimonial-schema.ts` is a strict object (an unknown field fails), every text is trimmed before its length check, and it holds exactly: `quote` (text, 20 to 320 characters), `name` (text, 1 to 60), `role` (text, 1 to 60), `company` (text, 1 to 60), `profileUrl` (optional, must start with `https://` and parse as an `https` URL, the same rule as a project link), `project` (optional, a slug string), `order` (whole number, 1 or more), and `permission`, a required strict object of `date` (a real calendar date written `YYYY-MM-DD`; `2026-02-30` fails) and `via` (one of `email`, `message`, `in-person`). It exports the output type `TestimonialData`.
- **AC-3**: The build fails, through one thrown error in the `testimonials` loader that lists every problem as `<file path>: <rule>: <message>` (the spec 0002 format), when any of these hold: a field breaks the schema (AC-2); a file name is not a lowercase kebab case slug (`checkSlug` from `src/lib/project-checks.ts`); two quotes share an `order` (`findDuplicateOrders` from the same file); `project` names an id with no folder `src/content/projects/<id>/index.md` (rule `unknown-project`); or `quote`, `name`, `role` or `company` contains contact details (rule `contact-details`, AC-4). A draft project's id counts as known.
- **AC-4**: `findContactDetails(entry)` in `src/lib/testimonial-checks.ts` is pure and returns one problem per offending field when that field's text contains an email shaped string (`something@something.tld`) or a run of seven or more digits once spaces, dots, dashes, slashes and brackets are removed (a phone number). `checkProjectRefs(entries, projectIds)` in the same file is pure and returns one `unknown-project` problem per entry whose `project` is set and not in `projectIds`. Both return an empty list when all is well and never throw.
- **AC-5**: The loader reads the known project ids by listing the folders under `PROJECTS_BASE` that hold an `index.md`, at the edge in `src/content.config.ts`, and passes them to `checkProjectRefs`. It does not read the `projects` content store.

*Helpers*
- **AC-6**: `src/lib/testimonials.ts` exports `type Testimonial = CollectionEntry<'testimonials'>` and these pure helpers, none of which mutates its input: `sortTestimonials(entries)` returns a new list sorted by `order`, lowest first; `HOME_TESTIMONIAL_LIMIT` is the exported constant `3`; `homeTestimonials(sorted)` returns the first `HOME_TESTIMONIAL_LIMIT`; `testimonialsFor(projectId, sorted)` returns, in the given order, every quote whose `project` equals `projectId`; `attributionLine(data)` returns `` `${role}, ${company}` ``; and `testimonialView(entry, projects)` returns `{ id, quote, name, profileUrl, attribution, project }`, where `project` is `{ title, href: projectPath(id) }` only when the quote's `project` matches an entry in `projects` (the list the page already filtered with `visibleProjects`), otherwise `undefined`. `permission` is never part of the view.

*The component*
- **AC-7**: `src/components/Testimonials.astro` takes `heading`, `id`, an optional `projectLabel`, and `testimonials` (a list of views from AC-6). With an empty list it renders nothing at all. Otherwise it renders a `Section` with the given `id` and the `<h2>` heading, holding an unbulleted `<ul>` with Stack gap `lg` and one `<li>` per view in the given order. Each `<li>` holds a `<figure>` with a `<blockquote>` holding one `<p>` with the `quote` text, then a `<figcaption>` holding a `<p>` with the `name` (an `<a href={profileUrl}>` around the name when `profileUrl` is set, plain text otherwise), a `<p>` with `attribution`, and, only when the view has a `project` and `projectLabel` is given, a `<p>` with `projectLabel` followed by `<a href={project.href}>{project.title}</a>`.
- **AC-8**: Quote sizes: with exactly one view the quote text is Source Serif 4 at weight 400, `--text-2xl`; with two or more each is `--text-xl`. The quote text is `text` colour, inside `max-w-measure`, with a 2px `line` left border and `1.25rem` left padding, not italic, and no quotation marks are added (by markup or CSS). The name is Inter 600 `--text-base` `text`; the attribution and the project line are `--text-sm` `muted`; links use the in text link style with targets at least 24 pixels tall (`inline-flex min-h-6 items-center`). The figcaption sits `0.75rem` below the quote. No image, card border, background or shadow.

*Where it shows*
- **AC-9**: On the home page, `Testimonials` sits directly after `SelectedWork` and before the About section, with `id="testimonials"`, `heading={HOME.testimonialsHeading}`, `projectLabel={HOME.testimonialsProjectLabel}`, and the views of `homeTestimonials(sortTestimonials(await getCollection('testimonials')))` built against the page's visible projects (`visibleProjects` with `includeDrafts: import.meta.env.DEV`). A quote pointing at a draft project shows in production without its project line.
- **AC-10**: On each project page, `Testimonials` sits directly after the write up (`Prose`) and before the closing section, with `id="testimonials"`, `heading={PROJECT_PAGE.testimonialsHeading}`, no `projectLabel`, and the views of `testimonialsFor(project.id, sortTestimonials(...))`, all of them, with no cap. So the page never links to itself.
- **AC-11**: With today's content (no quotes), `dist/index.html` and every `dist/projects/<id>/index.html` contain no element with `id="testimonials"`, no `<blockquote>` outside `Prose`, and no text of `HOME.testimonialsHeading` or `PROJECT_PAGE.testimonialsHeading`; the home page's sections keep their current order. No page shows an empty heading or a "coming soon" line.

*Words*
- **AC-12**: `HOME` in `src/lib/home.ts` gains `testimonialsHeading` (`What people say`, at most 40 characters) and `testimonialsProjectLabel` (`On`, at most 20), and `PROJECT_PAGE` in `src/lib/project-page.ts` gains `testimonialsHeading` (`What people said`, at most 40). `home.test.ts` and `project-page.test.ts` check each, after trimming, is non empty and within its limit. The quotes themselves are content, not page words, and are held to their limits by the schema (AC-2).

*Privacy, metadata, weight*
- **AC-13**: Nothing from `permission` reaches any built page: no file under `dist/` contains a quote's permission date or `via` value. The build test checks this against the fixture quote in AC-17.
- **AC-14**: Quotes add no JSON-LD (no `Review` or `Quotation` structured data), no new share tag, no JavaScript, no image and no dependency. `BaseLayout`, `seo.ts` and the sitemap are unchanged.
- **AC-15**: With quotes present, the home page and a project page keep one `<h1>`, the section heading is an `<h2>` with no `<h3>` inside the section, and the spec 0003 axe scan (WCAG 2.2 AA, both themes), the target size check and the width sweep (320 to 1440 pixels, no sideways scroll; a long name, company or project title wraps) all pass. Until a real quote exists these run against the style guide component tests and the fixture build only (AC-17); they then run on `/` through the existing shared path lists with no change.

*Design and style guide*
- **AC-16**: `design.md` gains a Components table row for `Testimonials` (`src/components/Testimonials.astro`) and a `### Testimonials` section with the values in AC-7 and AC-8 and the placements in AC-9 and AC-10. The dev only style guide shows `Testimonials` twice: once with one quote (no profile link, no project), once with two quotes (one with a profile link and a project line), from sample data written in the style guide page, not from the collection. `src/dev/styleguide.test.ts` checks both appear.

*Tests that need a quote*
- **AC-17**: Component tests (`src/components/testimonials.test.ts`, with the Astro container API like the other component tests) render `Testimonials` with zero, one and two views and check AC-7 and AC-8 (nothing rendered for zero; the size class for one versus two; the name link only with `profileUrl`; the project line only with both a `project` and a `projectLabel`). Schema and check tests (`src/lib/testimonial-schema.test.ts`, `src/lib/testimonial-checks.test.ts`, `src/lib/testimonials.test.ts`) cover every rule in AC-2 to AC-6 with in memory fixtures, including a phone number written `+31 6 12 34 56 78` and an email inside the quote text. No fixture quote is ever committed into `src/content/testimonials/`.

*Done gate*
- **AC-18**: Feature 14 is marked `done` only once at least one real quote file, with a `permission` record the person gave you, is merged and shows on `https://toyintest.org`. The build issue can finish before that; the board supplies the quote (see Follow-up).

## Decision

**Chosen option**: Option 1: a `testimonials` content collection of one YAML file per quote, checked at build time, shown stacked and large on the home page (up to three) and on the page of the project each quote points at.

The collection, its schema and its checks mirror the projects collection (spec 0002): a pure schema in `src/lib/testimonial-schema.ts`, pure checks in `src/lib/testimonial-checks.ts`, pure read helpers in `src/lib/testimonials.ts`, one new component `Testimonials.astro`, and the loader edge in `src/content.config.ts` as the one place that reads disk and throws. No new tool, dependency or server code.

**Implementation skills**: none beyond the project's own rules; `jdevalk/skills` astro-seo (spec 0007) needs no change, since quotes add no structured data (AC-14).

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**: one new collection, nothing persisted outside the repository.

| Field | Type | Required | Rules |
|---|---|---|---|
| id | the file name, `src/content/testimonials/<id>.yaml` | yes | lowercase kebab case slug, unique (file names are unique) |
| `quote` | string | yes | trimmed, 20 to 320 characters, plain text (no Markdown), no contact details |
| `name` | string | yes | trimmed, 1 to 60, the person's full name, no contact details |
| `role` | string | yes | trimmed, 1 to 60, their role when they worked with you, no contact details |
| `company` | string | yes | trimmed, 1 to 60, no contact details |
| `profileUrl` | string | no | `https://` URL of a public profile they chose to share |
| `project` | string | no | a project id (folder name under `src/content/projects/`, spec 0002) |
| `order` | integer | yes | 1 or more, unique across quotes; lowest shows first |
| `permission.date` | string | yes | `YYYY-MM-DD`, a real date: when they said yes to this wording and attribution |
| `permission.via` | enum | yes | `email` · `message` · `in-person`: how they said yes |

Relationships: a quote points at 0 or 1 project by id (N to 1, optional); a project has 0 or more quotes. The link is checked at build time (AC-3) and resolved at render (AC-6). `permission` is a record for you, never rendered (AC-13). There is no `draft` field: a quote enters the repository only once the yes is recorded.

Example file, `src/content/testimonials/jane-doe.yaml`:

```yaml
quote: >-
  Toyin rebuilt our cluster as code in three weeks, and we have not touched it by hand since.
name: Jane Doe
role: Engineering lead
company: Example BV
profileUrl: https://www.example.com/in/janedoe
project: hetzner-talos-cluster
order: 10
permission:
  date: '2026-11-02'
  via: email
```

**State transitions**: none. A quote file exists (shown) or does not.

**Interface surface** (functions and one component; no endpoint):

| Name | Signature | Returns | Errors |
|---|---|---|---|
| `testimonialSchema` | Zod strict object (AC-2) | `TestimonialData` | schema issues, which fail the build |
| `findContactDetails` | `(entry: { id; data: Pick<TestimonialData, 'quote' \| 'name' \| 'role' \| 'company'> }) => readonly Problem[]` | `contact-details` problems | none thrown |
| `checkProjectRefs` | `(entries: readonly { id; project?: string }[], projectIds: ReadonlySet<string>) => readonly Problem[]` | `unknown-project` problems | none thrown |
| `sortTestimonials` | `(entries: readonly Testimonial[]) => readonly Testimonial[]` | new list by `order` | none |
| `homeTestimonials` | `(sorted: readonly Testimonial[]) => readonly Testimonial[]` | first `HOME_TESTIMONIAL_LIMIT` (3) | none |
| `testimonialsFor` | `(projectId: string, sorted: readonly Testimonial[]) => readonly Testimonial[]` | quotes pointing at the project | none |
| `attributionLine` | `(data: Pick<TestimonialData, 'role' \| 'company'>) => string` | `Role, Company` | none |
| `testimonialView` | `(entry: Testimonial, projects: readonly Project[]) => TestimonialView` | the render shape (AC-6) | none |
| `Testimonials.astro` | props `heading: string`, `id: string`, `projectLabel?: string`, `testimonials: readonly TestimonialView[]` | the section, or nothing | none |

`TestimonialView` is `{ readonly id: string; readonly quote: string; readonly name: string; readonly profileUrl?: string; readonly attribution: string; readonly project?: { readonly title: string; readonly href: string } }`, exported from `src/lib/testimonials.ts` with a doc comment.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Home section | which quotes, in what order | `homeTestimonials(sortTestimonials(getCollection('testimonials')))`: the `order` field, first 3 |
| Home section | section heading, project line label | `HOME.testimonialsHeading`, `HOME.testimonialsProjectLabel` |
| Home section | project title and link on a quote | the quote's `project` id matched against the page's `visibleProjects` list; `title` from that project's frontmatter, `href` from `projectPath(id)` |
| Project page section | which quotes | `testimonialsFor(project.id, sorted)`, the page's own project id from `getStaticPaths` |
| Project page section | section heading | `PROJECT_PAGE.testimonialsHeading` |
| Either | quote text, name, profile link | the quote file's `quote`, `name`, `profileUrl` |
| Either | the attribution line | `attributionLine`: the file's `role` and `company` |
| Either | quote size | the number of views passed in (1 gives `--text-2xl`, more gives `--text-xl`) |
| Loader check | known project ids | folder names under `PROJECTS_BASE` holding `index.md`, read at the loader edge |
| Permission record | date and channel | written by you in the file from the person's reply; the reply itself stays in your inbox |

**Key invariants**:
- Every quote has a recorded yes (`permission`), or the build fails.
- Every `project` on a quote names an existing project folder, or the build fails.
- No quote text or attribution contains an email address or phone number, or the build fails.
- `permission` never appears in any built page.
- A section with no quotes is never rendered, on any page.
- The home page shows at most `HOME_TESTIMONIAL_LIMIT` quotes; a project page shows all of its own.
- A project page never links a quote to itself; the home page links a quote's project only when that project page exists in the build.

**Security model**: everything is public, static and read only; there is nothing to authorise. The privacy rule is the one that matters: this repository is public, so a quote file holds only what the person agreed to show (name, role, company, an optional public profile URL they chose) plus the date and channel of their yes. No email address, phone number or street address ever goes into a file; the contact details check (AC-4) catches the common slips, and the evidence of permission (their actual message) stays in your inbox. Taking a quote down is deleting its file and merging; it leaves the live site on the next deploy, though it stays in git history, which is why the yes covers the exact wording before it is committed.

**Configuration required**: none. No new environment variable, secret or service.

**Critical test scenarios**:
- Happy path: two fixture quotes, one pointing at a visible project, render on the home view with the second quote's project line linking to `/projects/<id>`, and on that project's view without a project line, verifies **AC-6**, **AC-7**, **AC-9**, **AC-10**.
- One quote: a single view renders at `--text-2xl`, two views at `--text-xl`, verifies **AC-8**.
- Empty: today's build has no testimonials section on any page, verifies **AC-11**.
- Failure case: a quote with no `permission`, with `project: no-such-project`, with a phone number in `company`, or sharing an `order`, each fails with its rule named, verifies **AC-2**, **AC-3**, **AC-4**.
- Privacy: the permission date and channel never reach rendered HTML, verifies **AC-13**.

## Build plan

Skateboard: the whole feature ships in one pass, working end to end with no quotes, then grows by content alone.

1. Add `testimonialSchema` and `TestimonialData` in `src/lib/testimonial-schema.ts`, with `src/lib/testimonial-schema.test.ts`, satisfies **AC-2**, **AC-17**
2. Add `findContactDetails` and `checkProjectRefs` in `src/lib/testimonial-checks.ts`, reusing `Problem`, `checkSlug` and `findDuplicateOrders` from `src/lib/project-checks.ts`, with `src/lib/testimonial-checks.test.ts`, satisfies **AC-3**, **AC-4**, **AC-17**
3. Define the `testimonials` collection in `src/content.config.ts`: the glob loader over `*.yaml`, the project id listing at the edge, every check, and the one throw; add `src/content/testimonials/.gitkeep`, satisfies **AC-1**, **AC-3**, **AC-5**
4. Add the read helpers and `TestimonialView` in `src/lib/testimonials.ts`, with `src/lib/testimonials.test.ts`, satisfies **AC-6**, **AC-17**
5. Build `src/components/Testimonials.astro` and `src/components/testimonials.test.ts`, satisfies **AC-7**, **AC-8**, **AC-17**
6. Add the words to `HOME` and `PROJECT_PAGE` and extend their tests, satisfies **AC-12**
7. Place the section on the home page after `SelectedWork` and on the project page after `Prose`, satisfies **AC-9**, **AC-10**
8. Add build tests: no testimonials section in today's `dist/` (extend `tests/build/home-build.test.ts` and `tests/build/project-build.test.ts`), and no `permission` value in rendered HTML, by rendering the component with the AC-17 fixture through the container API and asserting the date and channel are absent, satisfies **AC-11**, **AC-13**, **AC-14**
9. Update `design.md` (Components row, `### Testimonials` section) and the style guide with the one quote and two quote samples, extending `src/dev/styleguide.test.ts`, satisfies **AC-15**, **AC-16**
10. Copy this spec's [authoring.md](authoring.md) pointer into the pull request description, so the board knows how to add the first quote; the feature stays open until it lands, satisfies **AC-18**

## Consequences

**Positive**:
- Adding a quote is one small file, and the build refuses one with no recorded yes, broken attribution, a wrong project id or contact details in it.
- The feature ships today with nothing visible, and every later quote appears with no code change.
- A quote about a project shows on that project's page automatically.
- The same pattern as projects, so nothing new to learn.

**Negative / tradeoffs**:
- With an empty collection, Astro logs a warning on each build that the `testimonials` collection is empty; it is harmless and stops once the first quote lands.
- The browser tests (axe, widths, targets) cannot see a quote in production until a real one exists; until then the component tests and the style guide carry that coverage.
- The contact details check is a pattern match: it catches email addresses and phone numbers, not a street address or other identifying prose. Your review of each file is still the real gate.
- A removed quote stays in git history. The yes must be for the exact words and attribution before the file is committed.
- `permission.date` is not checked against today's date (that would read the clock inside a check), so a typo into the future passes.

**Neutral**:
- `src/content.config.ts` gains a second collection, and a second loader reads the project folders.
- Root `AGENTS.md` will need a Testimonials rule line; `/sync` owns that.

## Follow-up

- [ ] Board: collect the first quotes from past colleagues, managers and clients, and record each yes (date and channel) per [authoring.md](authoring.md). Feature 14 is done when the first one is live (AC-18).
- [ ] When the first real quote is live, confirm the existing e2e axe, width and target checks on `/` pass with it (AC-15); no test change should be needed.

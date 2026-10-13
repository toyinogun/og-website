# 0002. Project entry and case study content model

**Date**: 2026-10-13
**Status**: Proposed

## Summary

Every project on the site is one folder holding a Markdown file and its images. The top of the file holds 19 typed fields (title, outcome, who it was for, role, dates, tags, cover image, order and so on). The body tells the case study under three fixed headings: Problem, Approach, Outcome. The build checks all of this, so a write up with a missing field, an unknown tag, a missing section or a clashing order number fails the build instead of reaching a reader. Pages read projects only through a few small helpers, so the home page, the work listing and the project page all show the same facts in the same order.

## Requirements

**User stories**:
- As a hiring reader, I want every case study to show your role, the team, the stack and how you thought about the problem, so that I can judge you beyond a resume.
- As a client reader, I want every case study to say who the work was for, what type of work it was and what changed, so that I can see a problem like mine being solved.
- As the site owner, I want a malformed or unfinished write up to be stopped by the build, so that nothing broken or half written reaches either reader.
- As the site owner, I want to decide the order of my projects and which ones the home page shows, so that my strongest work comes first.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: A project folder `src/content/projects/<slug>/index.md` whose frontmatter meets every rule in the data model builds cleanly, and the typed entry exposes all 19 fields, with defaults applied: `metrics` and `links` default to empty lists, `featured` and `draft` default to `false`.
- **AC-2**: Any frontmatter rule violation fails `npm run build` (at `astro check` or `astro build`) with a message naming the file and the field. This covers: a missing required field, text over its length limit, an unknown `kind`, stack key, type of work key or link kind, a link `url` that is not `https://`, more than 3 metrics, a repeated stack or type of work key, a month not in `YYYY-MM` form, `end` before `start`, a cover narrower than 1200 pixels, an empty `coverAlt`, and an `order` that is not a whole number of at least 1.
- **AC-3**: For an entry with `draft` not `true`, the build fails, naming the file and the rule, when its body: does not start with `## Problem` (blank lines aside); lacks `## Approach` after `## Problem`; lacks `## Outcome` after `## Approach`; contains a `#` (level one) heading; contains a Markdown image with empty alt text; or contains a raw `<img>` tag. Extra `##` sections anywhere after `## Problem` are accepted. Headings and images inside fenced code blocks are ignored. A draft entry is exempt from every rule in this criterion.
- **AC-4**: Two or more entries sharing an `order` value, drafts included, fail the build with a message naming every file involved.
- **AC-5**: The checks behind AC-3 and AC-4 are pure functions that return a list of problems (never throw), and Vitest covers each rule with passing and failing fixtures under `npm test`.
- **AC-6**: `visibleProjects` drops drafts when asked to and keeps them otherwise; `sortProjects` orders by `order`, lowest first; `featuredProjects` returns only non draft entries with `featured: true`, in `order`.
- **AC-7**: `formatTimeframe` returns `Mar 2024 to Jan 2025` for a start and end, `Mar 2024 to present` with no end, and `Mar 2024` when start and end are the same month. Month names are fixed English short names, independent of the build machine's locale.
- **AC-8**: An entry's id is its folder name, and `projectPath(id)` returns `/projects/<id>`. A folder name that is not lowercase kebab case (`^[a-z0-9]+(-[a-z0-9]+)*$`) fails the build.
- **AC-9**: `src/lib/vocabulary.ts` holds every allowed key with a display name for the four lists (stack, type of work, kind, link kind). The label helpers return those display names, and `linkLabel` returns the link's own `label` when set, else the default name for its kind.
- **AC-10**: With zero entries, or with only drafts, the production build still succeeds; the helpers return empty lists rather than failing.
- **AC-11**: The cover and every inline image are optimised by Astro at build time, and a relative image path that points at a missing file fails the build.
- **AC-12**: A complete example entry exists as a draft and doubles as the authoring template, and the authoring rules are written down beside it, so feature 6 can copy a folder and start writing.

## Decision

**Chosen option**: Option 1: One typed collection, facts in frontmatter, story in a checked Markdown body.

Each project is one folder in a single Astro content collection called `projects`. The facts readers scan sit in typed frontmatter, and the case study sits in plain Markdown under three required headings. The build enforces both through the collection schema plus a cross entry check.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

### Files and where things live

| Path | What it is | Kind |
|---|---|---|
| `src/content.config.ts` | Defines the `projects` collection: loader, schema, build time checks | edge (reads files) |
| `src/content/projects/<slug>/index.md` | One project: frontmatter plus case study body | content |
| `src/content/projects/<slug>/*.{png,jpg,jpeg,webp}` | That project's cover and inline images | content |
| `src/lib/vocabulary.ts` | The fixed lists as read only key to display name maps, plus label helpers | pure |
| `src/lib/project-schema.ts` | `projectSchema(image)`, the Zod schema built from a passed in `image` helper, so tests can supply a stub | pure |
| `src/lib/project-checks.ts` | `checkBody`, `findDuplicateOrders`, `checkSlug`, each returning a list of problems | pure |
| `src/lib/projects.ts` | `visibleProjects`, `sortProjects`, `featuredProjects`, `projectPath`, `formatTimeframe`, `linkLabel` | pure |
| `docs/specs/0002-content-model/authoring.md` | The authoring guide feature 6 follows | docs |

Each `src/lib/*.ts` file gets a `*.test.ts` beside it, per `test-preferences.json`.

### Data model sketch

There is one entity, the **project**. It has no database. The collection schema is its table, and the folder name is its primary key.

| # | Field | Type | Required | Rule |
|---|---|---|---|---|
| (id) | folder name | string | yes | lowercase kebab case; unique by construction (one folder per id) |
| 1 | `title` | string | yes | 1 to 80 characters |
| 2 | `summary` | string | yes | 1 to 160 characters; one sentence on what the project is |
| 3 | `outcome` | string | yes | 1 to 120 characters; the one line result |
| 4 | `kind` | enum `client` · `employer` · `personal` · `open-source` | yes | key from `KINDS` |
| 5 | `client.name` | string | no | 1 to 60 characters when present; omitted for confidential work |
| 6 | `client.description` | string | yes | 1 to 80 characters; who the work was for, required for every kind |
| 7 | `role` | string | yes | 1 to 80 characters |
| 8 | `team` | string | no | 1 to 80 characters when present |
| 9 | `start` | string `YYYY-MM` | yes | month 01 to 12 |
| 10 | `end` | string `YYYY-MM` | no | missing means ongoing; must be the same month as `start` or later |
| 11 | `stack` | array of stack keys | yes | at least 1; no repeats; each in `STACK` |
| 12 | `services` | array of type of work keys | yes | at least 1; no repeats; each in `SERVICES` |
| 13 | `cover` | `image()` (relative path) | yes | width of at least 1200 pixels |
| 14 | `coverAlt` | string | yes | 1 to 160 characters after trimming |
| 15 | `metrics` | array of `{ value, label }` | no, default `[]` | at most 3; `value` 1 to 12 characters, `label` 1 to 40 |
| 16 | `links` | array of `{ kind, url, label? }` | no, default `[]` | `kind` in `LINK_KINDS`; `url` a valid URL starting `https://`; `label` 1 to 40 characters when present |
| 17 | `order` | integer | yes | at least 1; unique across all entries, drafts included (checked across entries, not by the schema) |
| 18 | `featured` | boolean | no, default `false` | |
| 19 | `draft` | boolean | no, default `false` | |

The schema is strict: an unknown frontmatter key fails the build, so a misspelt optional field (`teem:`) cannot be silently ignored.

**Relationships**: a project holds 0 to 3 metrics, 0 or more links, and 1 or more stack and type of work keys. These are value lists inside the entry, not separate records. Stack, type of work, kind and link kind values point into the fixed lists in `src/lib/vocabulary.ts`. That is a many to many link by key, enforced by the schema's enums. Nothing points at a project yet; its id is the stable key that Testimonials (feature 14) can reference later.

**Case study body** (plain Markdown, no MDX):

```markdown
## Problem
What was wrong or missing, and for whom.

## Approach
What you did and why, including the choices you rejected.

## Outcome
What changed, with the evidence.
```

- The body opens with `## Problem`, with nothing but blank lines before it. `## Approach` and `## Outcome` follow in that order. Headings match exactly, case sensitive, trailing spaces ignored.
- Extra `##` sections may appear anywhere after `## Problem`, for example `## Architecture` or `## What I would do differently`. Deeper headings (`###` and below) are free.
- There is no `#` heading in the body, because the page renders `title`.
- Images use Markdown syntax with a relative path into the same folder and non empty alt text: `![Checkout before and after](./checkout.png)`. Raw `<img>` tags are not allowed, because they would skip optimisation and the alt text check.
- The at a glance panel is rendered from fields 4 to 12 and is never written in the body.

**Vocabulary** (`src/lib/vocabulary.ts`):

```ts
/** Technologies a project used, keyed for the schema, valued for display. */
export const STACK = { typescript: 'TypeScript', astro: 'Astro' } as const;
/** Types of work, the client reader's view of a project. */
export const SERVICES = { 'frontend': 'Frontend', 'api-design': 'API design' } as const;
/** The kind of engagement, shown as a visible label. */
export const KINDS = { client: 'Client work', employer: 'Employer work', personal: 'Personal project', 'open-source': 'Open source' } as const;
/** Link kinds with their default label when a link has none. */
export const LINK_KINDS = { live: 'Live site', code: 'Code', 'app-store': 'App Store', video: 'Video', article: 'Article' } as const;
```

`KINDS` and `LINK_KINDS` are fixed by this spec. `STACK` and `SERVICES` start with just the values the example entry uses, and feature 6 adds the real ones as it writes each project. Adding a value is one line, and removing one fails the build for any entry still using it, which is the point. Keys are lowercase kebab case; the enums are derived from `Object.keys` so a key exists in exactly one place.

### State transitions

`draft` (`draft: true`: validated by the schema and the order check, exempt from the body rules, visible only on the local dev server) → `published` (`draft` removed or `false`: every rule applies, included in the production build). The transition is an edit to the file; there is no other state.

### Interface surface

There is no HTTP API. The surface is the collection plus the pure helpers that pages call. The draft decision is made at the edge, by the page, and passed in.

| Function | Signature | Returns | Key failure behaviour |
|---|---|---|---|
| `getCollection('projects')` | Astro built in | all entries, drafts included | schema violations fail the build before any page runs (AC-2) |
| `visibleProjects` | `(entries: readonly Project[], opts: { includeDrafts: boolean }) => readonly Project[]` | entries minus drafts unless `includeDrafts` | empty in, empty out |
| `sortProjects` | `(entries: readonly Project[]) => readonly Project[]` | a new array sorted by `order` ascending | never mutates its input |
| `featuredProjects` | `(entries: readonly Project[]) => readonly Project[]` | non draft, `featured: true`, sorted | empty list when none are featured |
| `projectPath` | `(id: string) => string` | `/projects/<id>` | |
| `formatTimeframe` | `(start: string, end?: string) => string` | `Mar 2024 to Jan 2025` · `Mar 2024 to present` · `Mar 2024` | inputs are already schema checked |
| `kindLabel`, `stackLabel`, `serviceLabel` | `(key) => string` | the display name | keys are typed, so an unknown key is a type error |
| `linkLabel` | `(link: ProjectLink) => string` | `link.label ?? LINK_KINDS[link.kind]` | |
| `checkBody` | `(body: string) => readonly Problem[]` | the AC-3 problems for one body | never throws |
| `findDuplicateOrders` | `(entries: readonly { id: string; order: number }[]) => readonly Problem[]` | one problem per clashing `order`, naming every id | never throws |
| `checkSlug` | `(id: string) => readonly Problem[]` | a problem when the id is not lowercase kebab case | never throws |

`Problem` is `{ readonly file: string; readonly rule: string; readonly message: string }`. Pages pass `includeDrafts: import.meta.env.DEV`. The home page (feature 7), the listing (feature 8) and the project page (feature 9) call these helpers instead of filtering or sorting on their own.

**Build time enforcement** (the board chose "in the build and in the tests"). The collection's loader is a thin wrapper around Astro's `glob()` loader (`pattern: '*/index.md'`, `base: './src/content/projects'`, with `generateId` returning the folder name). After `glob()` has loaded the entries, the wrapper reads every entry from the store and runs `checkSlug`, `checkBody` (non drafts only) and `findDuplicateOrders`. If any problems come back, it throws one error listing them all. That throw is the single sanctioned exception: it sits at the edge, and its whole job is to stop the build. The loader runs during `astro check` (which syncs content), `astro build` and `astro dev`, so Workers Builds' `astro check && astro build` gate catches a broken write up before deploy. Runner up, if the loader wrapper proves unworkable on Astro 7: call the same checks from the project page's `getStaticPaths` (feature 9). Before then, a contract test in `tests/` loads the real `src/content/projects/*/index.md` files and runs the checks, so CI still catches it.

### Value sourcing

| Action | Value produced / displayed | Source |
|---|---|---|
| Listing card, home card | title, outcome, cover, cover alt | `title`, `outcome`, `cover`, `coverAlt` |
| Listing card, home card | kind label | `kindLabel(kind)` from `KINDS` |
| Listing and home order | position | `order` through `sortProjects` / `featuredProjects` |
| Home page selection | which projects | `featured` and `draft` through `featuredProjects` |
| Card link, share URL | address | entry id (folder name) through `projectPath` |
| Page heading | title | `title` |
| Search description, share card text | description | `summary` |
| Share card image | image | `cover` (at least 1200 pixels wide by AC-2) |
| At a glance: kind | label | `kindLabel(kind)` |
| At a glance: who it was for | text | `client.name` when present, plus `client.description` always |
| At a glance: role, team | text | `role`; `team` when present |
| At a glance: when | text | `formatTimeframe(start, end)`; "present" is a fixed word in that helper |
| At a glance: stack, type of work | names | `stack` / `services` through `stackLabel` / `serviceLabel` |
| Headline numbers | value and label | `metrics[]` |
| Links | address and wording | `links[].url`; wording from `linkLabel` |
| Case study | prose and images | Markdown body, rendered by Astro |
| Draft visibility | include drafts or not | `import.meta.env.DEV`, read at the page edge, passed as `includeDrafts` |

### Key invariants

- Every published entry has all required fields, three sections in order, alt text on every image, and a cover at least 1200 pixels wide.
- No two entries share an `order`, drafts included.
- Every tag, kind and link kind value is a key in `src/lib/vocabulary.ts`.
- The id is the folder name, it is lowercase kebab case, and the address is always `/projects/<id>`.
- No page sorts, filters or formats a project on its own; all of that goes through `src/lib/projects.ts`.
- Helpers never mutate their input and never throw.

### Security model

Everything here is public static content; there are no accounts, writes or secrets. Two real exposures are the author's to manage, and the authoring guide states both:

- **The repository is public** (`toyinogun/og-website` on GitHub). The `draft` flag hides a write up from the site, not from GitHub. Anything committed, including drafts and their git history, is publicly readable. Do not commit material you are not ready for anyone to read, and never commit confidential client detail even as a draft.
- **Confidential work**: leave out `client.name`, and check that screenshots, alt text and links contain no client names, internal URLs or private data. The schema cannot see inside an image.

### Configuration required

None. No new environment variables, secrets, services or dependencies. The Zod schema comes from Astro (`astro/zod`); Markdown is built in; no MDX integration is added.

### Critical test scenarios

- Happy path: the example draft entry flipped to published passes every check, and the helpers sort, filter and format it, verifies **AC-1**, **AC-6**, **AC-7**, **AC-8**
- Failure case: a fixture missing `## Approach`, one with `## Outcome` before `## Approach`, one with an empty image alt, and two fixtures with the same `order` each produce the named problem; the same files with `draft: true` pass the body check but still fail the order check, verifies **AC-3**, **AC-4**, **AC-5**
- Failure case: a real build with a broken entry stops with a message naming the file, verifies **AC-2**, **AC-3** (checked by `/check verify`, see Build plan step 7)
- Edge case: an empty or drafts only collection builds and every helper returns `[]`, verifies **AC-10**
- Auth/permission: not applicable, there are no users. The equivalent guard is that drafts never appear in the production output, verifies **AC-6**

## Build plan

Skateboard: build the thinnest whole model end to end (schema, checks, helpers, one example entry) in one pass, so features 6 to 9 can rely on all of it at once. Nothing is rendered here; pages belong to features 7 to 9.

**Milestone 1: schema and vocabulary**
1. Create `src/lib/vocabulary.ts` with the four maps, the seed `STACK` and `SERVICES` values the example needs, the label helpers and doc comments, plus `vocabulary.test.ts`, satisfies **AC-9**
2. Create `src/lib/project-schema.ts` exporting `projectSchema(image)` (strict Zod object, every rule in the data model table, enums from the vocabulary keys, the `end` not before `start` refinement, the cover width refinement) and the `Project`, `ProjectLink` types, plus `project-schema.test.ts` driving it with a stub `image`, satisfies **AC-1**, **AC-2**

**Milestone 2: cross entry checks in the build**
3. Create `src/lib/project-checks.ts` (`checkBody` with a fence aware line scanner and no new dependency, `findDuplicateOrders`, `checkSlug`) plus `project-checks.test.ts` covering every rule in AC-3, AC-4 and AC-8 with passing and failing fixtures, satisfies **AC-3**, **AC-4**, **AC-5**, **AC-8**
4. Create `src/content.config.ts`: the `projects` collection with the `glob()` wrapper loader (folder name id, then the checks, then one throw listing every problem) and `schema: ({ image }) => projectSchema(image)`, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-8**, **AC-10**, **AC-11**

**Milestone 3: helpers, example entry and authoring guide**
5. Create `src/lib/projects.ts` (`visibleProjects`, `sortProjects`, `featuredProjects`, `projectPath`, `formatTimeframe`, `linkLabel`) plus `projects.test.ts`, satisfies **AC-6**, **AC-7**, **AC-8**, **AC-10**
6. Add `src/content/projects/example-project/` as a complete entry with `draft: true` and `order: 1`, a 1200 by 630 placeholder `cover.png` and one inline image. Write `docs/specs/0002-content-model/authoring.md` (how to copy the folder, every field with an example, the body rules, the two security notes from the Security model, how to add a vocabulary value, and that the first real entry replaces the example, which also frees `order: 1`). Add `tests/content-contract.test.ts`, which reads every real `src/content/projects/*/index.md` and runs the checks, satisfies **AC-1**, **AC-5**, **AC-11**, **AC-12**
7. Run `npm run build` and `npm test`. Then prove enforcement once by hand: temporarily remove `draft` from the example and delete its `## Approach`, and confirm the build fails naming the file; then add a duplicate `order` the same way. Revert both, and record the steps in `docs/specs/0002-content-model/verify.md`, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-10**

## Consequences

**Positive**:
- Every page reads one shape, so features 7 to 9 build against fixed fields instead of guessing.
- A broken, incomplete or misordered write up fails the build that gates deploy, not in front of a reader.
- Tags stay consistent and are ready for filtering later without a rewrite.
- Plain Markdown with headings keeps writing pleasant, and the structure still reads the same for both readers.

**Negative / tradeoffs**:
- The schema is strict: a new kind of fact means a spec change plus an edit to every entry that needs it. That is the cost of the reliability you asked for.
- Every new technology or type of work needs a one line vocabulary edit before an entry can use it.
- The loader wrapper ties enforcement to Astro's content layer API. An Astro major upgrade may move it, and the runner up path in the design is the fallback.
- Renaming a folder changes the page's address and breaks any link already shared. There is no redirect mechanism in this spec.
- Drafts are hidden from the site but public on GitHub.

**Neutral**:
- `order` numbers are manual. Leaving gaps (10, 20, 30) makes reordering cheap.
- The cover doubles as the share card image. Feature 12 decides how it is cropped to 1200 by 630; nothing here forbids a later optional share image field.
- The listing page's own address is feature 8's call; `/projects` is the natural match for `/projects/<slug>`.

## Follow-up

- [ ] Feature 6 (Bio & project write ups) writes real entries from `authoring.md`, adds real `STACK` and `SERVICES` values, and deletes the example once the first real entry lands.
- [ ] Feature 8 (Work listing) decides the listing address (`/projects` suggested) and the empty state, using `visibleProjects` and `sortProjects`.
- [ ] Feature 9 (Project detail page) renders the at a glance panel and body from this model, and owns `getStaticPaths` for `/projects/<slug>`.
- [ ] Feature 12 (Search metadata & share cards) uses `summary` as the description and `cover` as the share image.
- [ ] Feature 14 (Testimonials) may reference a project by its id.

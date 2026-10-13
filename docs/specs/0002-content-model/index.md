# 0002. Project entry and case study content model

**Date**: 2026-10-13
**Status**: Accepted

## Summary

Every project on the site is one folder holding a Markdown file and its images. The top of the file holds 19 typed fields (title, outcome, who it was for, role, dates, tags, cover image, order and so on). The body tells the case study under three fixed headings: Problem, Approach, Outcome. The build checks all of this, so a write up with a missing field, an unknown tag, a missing or empty section, a bad image or a clashing order number fails the build instead of reaching a reader. Pages read projects only through a few small helpers, so the home page, the work listing and the project page all show the same facts in the same order.

## Requirements

**User stories**:
- As a hiring reader, I want every case study to show your role, the team, the stack and how you thought about the problem, so that I can judge you beyond a resume.
- As a client reader, I want every case study to say who the work was for, what type of work it was and what changed, so that I can see a problem like mine being solved.
- As the site owner, I want a malformed or unfinished write up to be stopped by the build, so that nothing broken or half written reaches either reader.
- As the site owner, I want to decide the order of my projects and which ones the home page shows, so that my strongest work comes first.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: A project folder `src/content/projects/<slug>/index.md` whose frontmatter meets every rule in the data model builds cleanly. The typed entry exposes the 19 fields: the required ones always present, the optional ones (`client.name`, `team`, `end`) present only when written, and defaults applied (`metrics` and `links` default to empty lists, `featured` and `draft` to `false`).
- **AC-2**: Any frontmatter rule violation fails `npm run build` (at `astro check` or `astro build`) with a message naming the file and the field. This covers:
  - a missing required field;
  - text that is empty after trimming, or over its length limit after trimming;
  - an unknown key at any level (top level, inside `client`, inside a metric, inside a link);
  - an unknown `kind`, stack key, type of work key or link kind;
  - a link `url` that is not `https://`;
  - more than 3 metrics;
  - a repeated stack or type of work key;
  - a month not in `YYYY-MM` form;
  - `end` before `start`;
  - an `order` that is not a whole number of at least 1.
- **AC-3**: For an entry with `draft` not `true`, the build fails, naming the file and the rule, when the parsed body breaks any section rule:
  - the first top level block is not the heading `## Problem`;
  - `## Problem`, `## Approach` or `## Outcome` is missing, appears more than once, or appears out of that order;
  - a required section has no content block before the next level two heading;
  - there is a level one heading in either Markdown style.

  Extra level two sections anywhere after `## Problem` are accepted. Only top level headings count as sections, so headings inside lists, quotes or code are ignored. A draft entry is exempt from this criterion only.
- **AC-4**: Two or more entries sharing an `order` value, drafts included, fail the build with one message naming every file involved.
- **AC-5**: Every check behind AC-3, AC-4, AC-8, AC-12 and AC-13 is a pure function that returns a list of problems (never throws), and Vitest covers each rule with passing and failing fixtures under `npm test`.
- **AC-6**: `visibleProjects(entries, { includeDrafts: false })` drops drafts and `includeDrafts: true` keeps them. `sortProjects` orders by `order`, lowest first. `featuredProjects(visible)` returns the `featured: true` entries of the list it is given, in `order`. Pages pass the already visible list, so the local dev server previews featured drafts and production never shows a draft.
- **AC-7**: `formatTimeframe` returns `Mar 2024 to Jan 2025` for a start and end, `Mar 2024 to present` with no end, and `Mar 2024` when start and end are the same month. Month names are fixed English short names, independent of the build machine's locale.
- **AC-8**: An entry's id is its folder name exactly as written, checked before any normalising, and `projectPath(id)` returns `/projects/<id>`. A folder name that is not lowercase kebab case (`^[a-z0-9]+(-[a-z0-9]+)*$`) fails the build.
- **AC-9**: `src/lib/vocabulary.ts` holds every allowed key with a display name for the four lists (stack, type of work, kind, link kind). The label helpers return those display names, and `linkLabel` returns the link's own `label` when set, else the default name for its kind.
- **AC-10**: The production build succeeds with zero entries and with only drafts. With `includeDrafts: false`, `visibleProjects`, and therefore `featuredProjects`, return empty lists.
- **AC-11**: This feature guarantees that every image an entry references exists and is allowed (AC-12, AC-13), and registers the cover through Astro's `image()` schema helper. Producing and verifying optimised renditions belongs to the features that render them (7, 8, 9). Images of draft entries need not be optimised.
- **AC-12**: Each entry's folder holds exactly one cover file, named `cover.png`, `cover.jpg`, `cover.jpeg` or `cover.webp`. The `cover` field points at that file, and the file is at least 1200 pixels wide, measured from the real file at build time. Any violation fails the build, naming the file. This applies to drafts too.
- **AC-13**: Every image in a body (inline or reference style) meets all of these, or the build fails naming the file and the image:
  - the path is relative and stays inside the entry's folder (`./x.png` or `./sub/x.png`), with no `..`, no leading `/`, no `http:` or `https:` and no import alias;
  - the extension is png, jpg, jpeg or webp;
  - the file exists;
  - the alt text is not empty after trimming.

  Raw HTML containing `<img` or `<h1` (any letter case) also fails. This applies to drafts too.
- **AC-14**: A complete example entry exists as a draft and doubles as the authoring template, and the authoring rules are written down beside the spec, so feature 6 can copy a folder and start writing.

## Decision

**Chosen option**: Option 1: One typed collection, facts in frontmatter, story in a checked Markdown body.

Each project is one folder in a single Astro content collection called `projects`. The facts readers scan sit in typed frontmatter, and the case study sits in plain Markdown under three required headings. The build enforces both, through the collection schema plus a required cross entry check in the collection's loader.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

### Files and where things live

| Path | What it is | Kind |
|---|---|---|
| `src/content.config.ts` | Defines the `projects` collection: the loader wrapper, the schema, and the build time checks | edge (reads files) |
| `src/content/projects/<slug>/index.md` | One project: frontmatter plus case study body | content |
| `src/content/projects/<slug>/cover.{png,jpg,jpeg,webp}` | That project's cover, exactly one | content |
| `src/content/projects/<slug>/**/*.{png,jpg,jpeg,webp}` | That project's inline images | content |
| `src/lib/vocabulary.ts` | The fixed lists as read only key to display name maps, plus label helpers | pure |
| `src/lib/project-schema.ts` | `projectSchema(image)`, the Zod schema built from a passed in `image` helper; exports the `ProjectData` type | pure |
| `src/lib/project-checks.ts` | `checkBody`, `checkImages`, `checkCover`, `findDuplicateOrders`, `checkSlug`, each returning a list of problems | pure |
| `src/lib/projects.ts` | `Project` type, `visibleProjects`, `sortProjects`, `featuredProjects`, `projectPath`, `formatTimeframe`, `linkLabel` | pure |
| `docs/specs/0002-content-model/authoring.md` | The authoring guide feature 6 follows | docs |

Each `src/lib/*.ts` file gets a `*.test.ts` beside it, per `test-preferences.json`.

**New dependency**: `mdast-util-from-markdown` (the unified project's CommonMark parser, which turns Markdown into a syntax tree), added to `dependencies` because `src/content.config.ts` imports it during every build. It is not already installed: Astro 7 renders Markdown with its own `satteri` processor and exposes no syntax tree. It runs only at build time and ships nothing to visitors. `checkBody` and `checkImages` receive the parsed tree, so the parser is called once per entry, at the edge.

### Data model sketch

There is one entity, the **project**. It has no database. The collection schema is its table, and the folder name is its primary key.

| # | Field | Type | Required | Rule |
|---|---|---|---|---|
| (id) | folder name | string | yes | lowercase kebab case, checked as written; unique by construction (one folder per id) |
| 1 | `title` | string | yes | 1 to 80 characters |
| 2 | `summary` | string | yes | 1 to 160 characters; one sentence on what the project is |
| 3 | `outcome` | string | yes | 1 to 120 characters; the one line result |
| 4 | `kind` | enum `client` · `employer` · `personal` · `open-source` | yes | key from `KINDS` |
| 5 | `client.name` | string | no, absent when omitted | 1 to 60 characters when present; omitted for confidential work |
| 6 | `client.description` | string | yes | 1 to 80 characters; who the work was for, required for every kind |
| 7 | `role` | string | yes | 1 to 80 characters |
| 8 | `team` | string | no, absent when omitted | 1 to 80 characters when present |
| 9 | `start` | string `YYYY-MM` | yes | month 01 to 12 |
| 10 | `end` | string `YYYY-MM` | no, absent when omitted | missing means ongoing; must be the same month as `start` or later |
| 11 | `stack` | array of stack keys | yes | at least 1; no repeats; each in `STACK` |
| 12 | `services` | array of type of work keys | yes | at least 1; no repeats; each in `SERVICES` |
| 13 | `cover` | `image()` | yes | must be `./cover.png`, `./cover.jpg`, `./cover.jpeg` or `./cover.webp`; width checked at the edge (AC-12) |
| 14 | `coverAlt` | string | yes | 1 to 160 characters |
| 15 | `metrics` | array of `{ value, label }` | no, default `[]` | at most 3; `value` 1 to 12 characters, `label` 1 to 40 |
| 16 | `links` | array of `{ kind, url, label? }` | no, default `[]` | `kind` in `LINK_KINDS`; `url` a valid URL starting `https://`; `label` 1 to 40 characters when present |
| 17 | `order` | integer | yes | at least 1; unique across all entries, drafts included (checked across entries, not by the schema) |
| 18 | `featured` | boolean | no, default `false` | |
| 19 | `draft` | boolean | no, default `false` | |

**Schema rules that apply everywhere**:
- Every object is strict, at every level (the root, `client`, each metric, each link), so a misspelt key such as `teem:` or `client: { nmae: … }` fails the build instead of being dropped.
- Every text field is trimmed first and then length checked, so text that is only spaces fails. Lengths count characters after trimming.
- The `cover` value is first checked as a string against the allowed names, then handed to `image()` (`z.string().regex(…).pipe(image())` or the equivalent). The schema never reads image dimensions, because during content loading Astro holds the image only as a placeholder.

**Relationships**: a project holds 0 to 3 metrics, 0 or more links, and 1 or more stack and type of work keys. These are value lists inside the entry, not separate records. Stack, type of work, kind and link kind values point into the fixed lists in `src/lib/vocabulary.ts`. That is a many to many link by key, enforced by the schema's enums. Nothing points at a project yet; its id is the stable key that Testimonials (feature 14) can reference later.

**Types**:
- `ProjectData` is the schema's output type (`z.output` of `projectSchema`), exported from `src/lib/project-schema.ts`.
- `Project` is `CollectionEntry<'projects'>`, so a helper reads `entry.id` and `entry.data.*`.
- `ProjectLink` is `ProjectData['links'][number]`.

### Case study body

Plain Markdown, no MDX:

```markdown
## Problem
What was wrong or missing, and for whom.

## Approach
What you did and why, including the choices you rejected.

## Outcome
What changed, with the evidence.
```

The rules run on the syntax tree from `mdast-util-from-markdown`, looking only at the root's direct children, never at the raw text.

**Section rules** (published entries only, AC-3):
- The first child is a depth 2 heading whose text is exactly `Problem` (trimmed, case sensitive).
- Depth 2 headings with the texts `Problem`, `Approach` and `Outcome` each appear exactly once, in that order.
- Each of those three is followed by at least one child that is not a heading, before the next depth 2 heading or the end of the body.
- Other depth 2 headings may appear anywhere after `Problem`, for example `## Architecture` or `## What I would do differently`. Depth 3 and deeper headings are free.
- There are no depth 1 headings, whether written `#` or underlined with `===`, because the page renders `title`.
- Headings inside lists or quotes do not count as sections, and code is never inspected for headings.

**Image rules** (every entry, drafts included, AC-13):
- Every `image` node, and every `imageReference` together with its `definition`, has non empty trimmed alt text and a URL that passes the path rule.
- The path rule: relative, starting `./`, normalised path still inside the entry folder, extension png, jpg, jpeg or webp. No `..`, no leading `/`, no URL scheme, no `~` or `@` alias.
- Every `html` node is rejected if it contains `<img` or `<h1`, in any letter case.
- File existence is checked at the edge, which passes the pure `checkImages` a set of existing relative paths.

The at a glance panel is rendered from fields 4 to 12 and is never written in the body.

### Vocabulary

`src/lib/vocabulary.ts` holds the fixed lists:

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

- `KINDS` and `LINK_KINDS` are fixed by this spec.
- `STACK` and `SERVICES` start with just the values the example entry uses. Feature 6 adds the real ones as it writes each project.
- Adding a value is one line. Removing one fails the build for any entry still using it, which is the point.
- Keys are lowercase kebab case. The enums are derived from `Object.keys`, so a key exists in exactly one place.

### State transitions

`draft` → `published`. The transition is an edit to the file; there is no other state.

- **`draft`** (`draft: true`): the schema, cover, image and order checks still apply, and the section rules do not. Pages list it only on the local dev server.
- **`published`** (`draft` removed or `false`): every rule applies, and pages list it in the production build.

### Interface surface

There is no HTTP API. The surface is the collection plus the pure helpers that pages call. Pages decide whether to include drafts and pass that in.

| Function | Signature | Returns | Notes |
|---|---|---|---|
| `getCollection('projects')` | Astro built in | all entries, drafts included | schema violations fail the build before any page runs (AC-2) |
| `visibleProjects` | `(entries: readonly Project[], opts: { includeDrafts: boolean }) => readonly Project[]` | entries minus drafts unless `includeDrafts` | empty in, empty out |
| `sortProjects` | `(entries: readonly Project[]) => readonly Project[]` | a new array sorted by `data.order` ascending | never mutates its input |
| `featuredProjects` | `(visible: readonly Project[]) => readonly Project[]` | the `featured` entries of its input, sorted | does not filter drafts itself; callers pass the visible list |
| `projectPath` | `(id: string) => string` | `/projects/<id>` | |
| `formatTimeframe` | `(start: string, end?: string) => string` | `Mar 2024 to Jan 2025` · `Mar 2024 to present` · `Mar 2024` | inputs are already schema checked |
| `kindLabel`, `stackLabel`, `serviceLabel` | `(key) => string` | the display name | keys are typed, so an unknown key is a type error |
| `linkLabel` | `(link: ProjectLink) => string` | `link.label ?? LINK_KINDS[link.kind]` | |
| `checkBody` | `(tree: Root) => readonly Problem[]` | the AC-3 problems for one body | never throws |
| `checkImages` | `(tree: Root, existing: ReadonlySet<string>) => readonly Problem[]` | the AC-13 problems for one body | never throws |
| `checkCover` | `(cover: { coverField: string; files: readonly string[]; width: number \| undefined }) => readonly Problem[]` | the AC-12 problems for one entry | never throws |
| `findDuplicateOrders` | `(entries: readonly { id: string; order: number }[]) => readonly Problem[]` | one problem per clashing `order`, listing every id | never throws |
| `checkSlug` | `(id: string) => readonly Problem[]` | a problem when the id is not lowercase kebab case | never throws |

`Problem` is `{ readonly rule: string; readonly message: string; readonly ids: readonly string[] }`. The pure checks know only ids. The loader edge maps each id to that entry's `filePath` when it builds the error. Pages pass `includeDrafts: import.meta.env.DEV`. The home page (feature 7), the listing (feature 8) and the project page (feature 9) call these helpers instead of filtering or sorting on their own.

### Build time enforcement

The board chose "in the build and in the tests". This mechanism is **required**: there is no fallback. If `/develop` finds it cannot work on Astro 7, the build stops and the question returns to `/architect`.

The collection's loader is a thin wrapper around Astro's `glob()` loader, configured with `pattern: '*/index.md'`, `base: './src/content/projects'`, and a `generateId` that returns the folder name exactly as written. The wrapper's `load(context)` works in five steps:

1. Await `glob().load(context)`.
2. For each entry in `context.store`, read `id`, `filePath`, `body`, `data.draft`, `data.order` and the raw `cover` string.
3. At the edge:
   - parse the body once with `fromMarkdown`;
   - list the image files in the entry's folder (recursively) with `node:fs`;
   - read the cover's bytes and measure its width with Astro's `imageMetadata` from `astro/assets/utils` (no new dependency).
4. Call `checkSlug`, `checkCover`, `checkImages`, `checkBody` (non drafts only) and `findDuplicateOrders` across all entries.
5. If any problems come back, throw one `Error` listing every problem as `<filePath>: <rule>: <message>`.

That throw is the single sanctioned exception: it sits at the edge, and its whole job is to stop the build. The checks re-read the cover file on every run, so a cover swapped for a smaller file without a Markdown change is still caught, even with a warm content cache.

**When the checks run.** They run in three places:
- `astro check`, which syncs content: this is the pre commit hook and the first half of the Workers Builds gate;
- `astro build`;
- each start of `astro dev`.

They do **not** run again on edits made while `astro dev` is running, because the `glob()` loader's file watcher updates the store directly. The fix is to restart the dev server; the next commit catches it anyway. The authoring guide says this.

**Tests.** The pure checks get unit tests. `tests/content-contract.test.ts` also runs every real entry through the same checks under Vitest, so CI reports the same problems as the build.

### Value sourcing

| Action | Value produced / displayed | Source |
|---|---|---|
| Listing card, home card | title, outcome, cover, cover alt | `title`, `outcome`, `cover`, `coverAlt` |
| Listing card, home card | kind label | `kindLabel(kind)` from `KINDS` |
| Listing and home order | position | `order` through `sortProjects` / `featuredProjects` |
| Home page selection | which projects | `visibleProjects` then `featuredProjects` |
| Card link, share URL | address | entry id (folder name) through `projectPath` |
| Page heading | title | `title` |
| Search description, share card text | description | `summary` |
| Share card image | image | `cover` (at least 1200 pixels wide by AC-12) |
| At a glance: kind | label | `kindLabel(kind)` |
| At a glance: who it was for | text | `client.name` when present, plus `client.description` always |
| At a glance: role, team | text | `role`; `team` when present |
| At a glance: when | text | `formatTimeframe(start, end)`; "present" is a fixed word in that helper |
| At a glance: stack, type of work | names | `stack` / `services` through `stackLabel` / `serviceLabel` |
| Headline numbers | value and label | `metrics[]` |
| Links | address and wording | `links[].url`; wording from `linkLabel` |
| Case study | prose and images | Markdown body, rendered by Astro in feature 9 |
| Cover width check | width in pixels | the cover file's bytes, read at the loader edge, measured by `imageMetadata` |
| Inline image existence | set of existing paths | `node:fs` listing of the entry folder, read at the loader edge |
| Error file names | file path | `filePath` on each store entry, mapped from `Problem.ids` at the loader edge |
| Draft visibility | include drafts or not | `import.meta.env.DEV`, read at the page edge, passed as `includeDrafts` |

### Key invariants

- Every published entry has all required fields, the three sections once each in order with content, and no level one heading.
- Every entry, draft or not, has exactly one valid cover at least 1200 pixels wide, and every body image is a local, existing, allowed file with alt text.
- No two entries share an `order`, drafts included.
- Every tag, kind and link kind value is a key in `src/lib/vocabulary.ts`.
- The id is the folder name, it is lowercase kebab case, and the address is always `/projects/<id>`.
- No page sorts, filters or formats a project on its own; all of that goes through `src/lib/projects.ts`.
- Helpers and checks never mutate their input and never throw. The loader edge is the only place that throws.

### Security model

Everything here is public static content; there are no accounts, writes or secrets. Three exposures are the author's to manage, and the authoring guide states all of them:

- **The repository is public** (`toyinogun/og-website` on GitHub). The `draft` flag hides a write up from the site's pages, not from GitHub. Anything committed, including drafts and their git history, is publicly readable. Do not commit material you are not ready for anyone to read, and never commit confidential client detail even as a draft.
- **Drafts are not secret in the build either.** Drafts are kept out of every page and list, but their image files may still be copied into `dist` and served if someone guesses the address.
- **Confidential work**: leave out `client.name`, and check that screenshots, alt text and links contain no client names, internal URLs or private data. The schema cannot see inside an image.

### Configuration required

No environment variables, secrets or services. One new runtime dependency, `mdast-util-from-markdown`, in `dependencies` (see Files above). The Zod schema comes from Astro (`astro/zod`), `imageMetadata` from `astro/assets/utils`, and no MDX integration is added.

### Critical test scenarios

- Happy path: the example draft entry flipped to published passes every check, and the helpers sort, filter and format it, verifies **AC-1**, **AC-6**, **AC-7**, **AC-8**
- Failure case, unit: fixtures for each section rule (missing, repeated, out of order, empty section, Setext level one heading, heading inside a quote not counting) and each image rule (empty alt, reference style image with empty alt, `../` path, remote URL, `.gif`, raw `<IMG>`), plus duplicate orders, each produce the named problem. A draft with a broken section passes `checkBody` but still fails the image and order checks, verifies **AC-3**, **AC-4**, **AC-5**, **AC-13**
- Failure case, real build: see Build plan step 7, verifies **AC-2**, **AC-3**, **AC-4**, **AC-12**, **AC-13**
- Edge case: an empty collection and a drafts only collection build, and every production helper returns `[]`, verifies **AC-10**
- Auth/permission: not applicable, there are no users. The equivalent guard is that `visibleProjects` with `includeDrafts: false` never returns a draft, verifies **AC-6**

## Build plan

Skateboard: build the thinnest whole model end to end (schema, checks, helpers, one example entry) in one pass, so features 6 to 9 can rely on all of it at once. Nothing is rendered here; pages belong to features 7 to 9.

**Milestone 1: schema and vocabulary**
1. [x] Create `src/lib/vocabulary.ts` with the four maps, the seed `STACK` and `SERVICES` values the example needs, the label helpers and doc comments, plus `vocabulary.test.ts`, satisfies **AC-9**
2. [x] Create `src/lib/project-schema.ts` exporting `projectSchema(image)` and `ProjectData`. It is strict at every level, trims before every length check, takes its enums from the vocabulary keys, refines `end` not before `start`, and checks the cover name before `image()`. Add `project-schema.test.ts` driving it with a stub `image`, including typo keys at each level and text that is only spaces, satisfies **AC-1**, **AC-2**

**Milestone 2: checks in the build**
3. Add `mdast-util-from-markdown` to `dependencies`. Create `src/lib/project-checks.ts` (`checkBody`, `checkImages`, `checkCover`, `findDuplicateOrders`, `checkSlug`, the `Problem` type) plus `project-checks.test.ts` with a passing and a failing fixture for every rule listed under Case study body, satisfies **AC-3**, **AC-4**, **AC-5**, **AC-8**, **AC-12**, **AC-13**
4. Create `src/content.config.ts`: the `projects` collection with the `glob()` wrapper loader as described under Build time enforcement, and `schema: ({ image }) => projectSchema(image)`, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-8**, **AC-10**, **AC-11**, **AC-12**, **AC-13**

**Milestone 3: helpers, example entry, authoring guide and proof**
5. Create `src/lib/projects.ts` (`Project`, `ProjectLink`, `visibleProjects`, `sortProjects`, `featuredProjects`, `projectPath`, `formatTimeframe`, the label helpers) plus `projects.test.ts`, satisfies **AC-6**, **AC-7**, **AC-8**, **AC-9**, **AC-10**
6. Add `src/content/projects/example-project/`, a complete entry with `draft: true` and `order: 1`, a 1200 by 630 placeholder `cover.png` and one inline image. Add `tests/content-contract.test.ts`, which runs every real entry through the checks. Write `docs/specs/0002-content-model/authoring.md`, covering:
   - how to copy the folder;
   - every field with an example;
   - the body and image rules;
   - the three security notes from the Security model;
   - that dev edits are only rechecked on restart;
   - how to add a vocabulary value;
   - that the first real entry replaces the example, which also frees `order: 1`.

   Satisfies **AC-1**, **AC-5**, **AC-14**
7. Run `npm run build` and `npm test` clean. Then prove enforcement with real builds. Make each change below on its own, confirm the result, then revert it.

   These builds must **fail**, naming the file:
   - a published entry missing `## Approach`;
   - a published entry with an empty `## Outcome`;
   - a missing cover;
   - a cover 1199 pixels wide;
   - a 1200 pixel cover swapped for a 1199 pixel one without touching the Markdown, run a second time on a warm cache;
   - an inline image pointing at a missing file;
   - an inline image with empty alt text, in a draft;
   - two entries with the same `order`;
   - a misspelt key inside `client`.

   These builds must **succeed**:
   - no entries at all;
   - only drafts.

   Record every step and its observed result in `docs/specs/0002-content-model/verify.md`. Satisfies **AC-2**, **AC-3**, **AC-4**, **AC-10**, **AC-12**, **AC-13**

## Consequences

**Positive**:
- Every page reads one shape, so features 7 to 9 build against fixed fields instead of guessing.
- A broken, incomplete, empty or misordered write up fails the build that gates deploy, not in front of a reader.
- Body rules run on a real Markdown syntax tree, so the edge cases of Markdown syntax cannot slip past a hand written scanner.
- Tags stay consistent and are ready for filtering later without a rewrite.

**Negative / tradeoffs**:
- The schema is strict: a new kind of fact means a spec change plus an edit to every entry that needs it. That is the cost of the reliability you asked for.
- Every new technology or type of work needs a one line vocabulary edit before an entry can use it.
- One new dependency, `mdast-util-from-markdown`, to keep updated. Its CommonMark parse can differ from Astro's `satteri` renderer in rare corners, so a check could in theory pass Markdown that renders differently.
- The loader wrapper ties enforcement to Astro's content layer API (`glob()`, `context.store`, `imageMetadata`). An Astro major upgrade may move it, and then this spec comes back to `/architect`.
- Edits made while `astro dev` is running are not rechecked until a restart or the next commit.
- Renaming a folder changes the page's address and breaks any link already shared. There is no redirect mechanism in this spec.
- Drafts are hidden from pages but public on GitHub, and their images may be present in `dist`.
- The cover must be named `cover.*`, a small naming rule the author has to remember (the build reminds them).

**Neutral**:
- `order` numbers are manual. Leaving gaps (10, 20, 30) makes reordering cheap.
- The cover doubles as the share card image. Feature 12 decides how it is cropped to 1200 by 630; nothing here forbids a later optional share image field.
- The listing page's own address is feature 8's call; `/projects` is the natural match for `/projects/<slug>`.

## Follow-up

- [ ] Feature 6 (Bio & project write ups) writes real entries from `authoring.md`, adds real `STACK` and `SERVICES` values, and deletes the example once the first real entry lands.
- [ ] Features 7 to 9 render images through Astro's image pipeline and verify that the optimised renditions are produced (AC-11 hands this to them).
- [ ] Feature 8 (Work listing) decides the listing address (`/projects` suggested) and the empty state, using `visibleProjects` and `sortProjects`.
- [ ] Feature 9 (Project detail page) renders the at a glance panel and body from this model, owns `getStaticPaths` for `/projects/<slug>`, and confirms that draft routes are absent from the production build.
- [ ] Feature 12 (Search metadata & share cards) uses `summary` as the description and `cover` as the share image.
- [ ] Feature 14 (Testimonials) may reference a project by its id.

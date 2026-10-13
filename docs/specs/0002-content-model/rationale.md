# 0002. Project entry and case study content model: rationale

Decision record for [index.md](index.md). `/develop` builds from `index.md` and can skip this file.

## Context

This is a personal site whose job is to win work. Two readers judge the same pages: someone deciding whether to hire you, and someone deciding whether to contract you. Both want real work, clearly explained. The hiring reader looks for your role, what you owned within a team, the technologies, and how you think. The client reader looks for who the work was for, what type of work it was, and what changed for them. A case study has to serve both without becoming two documents.

Spec 0001 already fixed the mechanism: the site is pre rendered Astro, and content is typed Markdown in the repository inside Astro content collections, with Astro's image handling. There is no database and no admin screen. So the content model is the collection's schema plus the conventions for the Markdown body. Every write up (feature 6) and every page that reads one (features 7, 8, 9, 12, and later 14) depends on it. Changing a field later means editing every entry and every page, which is why the scope calls this the most expensive thing here to get wrong.

Several forces pull on it. Write ups are drafted by an agent from a resume and repositories and then edited by you, so the shape must be easy to fill in and easy to check. The work shown spans client, employer, personal and open source projects, and some client or employer work is confidential. The scope wants the order of projects to be deliberate, every listed project to have an image and a one line outcome, and a malformed write up to fail the build rather than render badly. Workers Builds deploys `main` after `astro check && astro build` and does not run the test suite, so anything only a test catches can still go live. The repository is public on GitHub.

Without a decision, each page would invent its own reading of a project, write ups would drift apart in shape, and the first real reorganisation would mean rewriting all of them.

## Options considered

### Option 1: One typed collection, facts in frontmatter, story in a checked Markdown body

Each project is a folder with `index.md` and its images. The facts a reader scans (kind, who it was for, role, team, dates, stack, type of work, cover, metrics, links, ordering) are typed frontmatter fields. The case study is ordinary Markdown under three required headings, checked at build time and in tests.

**Pros**:
- Prose stays prose: easy to write, edit and review as Markdown.
- The schema guarantees every fact the pages need; the body check guarantees the story's shape.
- Images sit beside the text, are optimised, and a broken path fails the build.

**Cons**:
- The body rules need a small custom check, because a schema cannot see the body.
- The heading text is a convention the author must type exactly.

### Option 2: Fully structured, each section a frontmatter field

`problem`, `approach` and `outcome` are long text fields in the frontmatter, and the body is empty or unused.

**Pros**:
- The schema alone guarantees every section exists; no custom check.
- Pages can place each section anywhere, independently.

**Cons**:
- Long prose inside YAML is awkward to write and edit, with indentation and quoting traps.
- Inline images and extra sections become hard or impossible.

### Option 3: Two collections, full case studies plus short entries

A `caseStudies` collection with the full shape, and a lighter `projects` collection for smaller work listed without its own page.

**Pros**:
- Shows breadth without a full write up for every project.

**Cons**:
- Two shapes, two listing styles and two sets of pages to build and keep in step.
- Promoting a short entry to a case study means moving it between collections.

### Option 4: Free form body with a minimal schema

Only `title`, `summary` and a cover are required; the body is free.

**Pros**:
- The fastest to write and the least to build.

**Cons**:
- Write ups drift apart, and the detail page cannot rely on any section existing.
- Facts like role and stack end up buried in prose, invisible to a skimming reader.

## Rationale

Option 1 is the only one that gives both readers what they scan for in fixed, typed places while keeping the story pleasant to write. The board chose its main parts explicitly: the at a glance panel followed by Problem, Approach and Outcome; headings checked rather than prose in YAML; one kind of entry; an optional client name with a required description; an outcome line plus up to three numbers; fixed tag lists; an explicit order; and plain Markdown. Option 2 buys schema level certainty at the cost of the writing experience, which matters here because every entry is drafted and then edited by hand. Option 3 doubles the pages to build in a two week skateboard plan. Option 4 fails the scope's requirement that the structure reads well for both readers.

The checks run in the build as well as the tests, also a board choice. The reason is the deploy path: Workers Builds runs only `astro check && astro build`, so a rule enforced only by Vitest can still deploy. Running the same pure checks inside the content loader stops the build at the gate that deploys. A small exception (one throw at the edge) is accepted for this, because failing the build is the intended outcome and the checks themselves stay pure and return values.

The recommendations I settled while writing:

- **Strict schema, unknown keys rejected.** A misspelt optional field would otherwise vanish silently. Runner up: passthrough, which forgives typos and hides them.
- **The body must open with `## Problem`.** A lede before it would duplicate `summary` and make the shape vary at the top, where readers look first. Runner up: allow an intro paragraph.
- **No raw `<img>`.** It would bypass both optimisation and the alt text check. Runner up: allow it with a regex for `alt`, which is fragile.
- **A real Markdown syntax tree (`mdast-util-from-markdown`), not a line scanner.** The first draft chose a line scanner. The cross check (JSM-10) showed it leaves too much open: empty sections, repeated headings, Setext headings, reference style images, HTML and code spans. The parser settles all of these with a well known CommonMark implementation. It is a new dependency, because Astro 7 renders Markdown with its own `satteri` processor and exposes no tree. Runner up: a restricted grammar line scanner, which needs no dependency but has to reimplement parts of Markdown and would drift.
- **Image rules apply to drafts; section rules do not.** A draft's images are still processed by the build, so a broken path or missing alt text should fail early. An unfinished story should not. Runner up: exempt drafts from everything, which lets broken images pile up until publish day.
- **The cover file is named `cover.*`, and its width is measured at the loader edge.** During content loading Astro holds images only as placeholders, so a schema refinement cannot see the width (confirmed in the Astro 7.3.8 source by the cross check). A fixed name lets the edge find the file without parsing Astro's internal placeholder format. Runner up: parse the placeholder string, which breaks silently on an Astro upgrade.
- **Checks run at startup, check and build, not on every dev edit.** Rerunning them after each watcher update would mean wrapping the loader's internal watcher, which is more fragile than its value. The pre commit `astro check` and Workers Builds both catch everything. Runner up: revalidate after each dev update.
- **No fallback for the deploy gate.** An earlier draft allowed falling back to page level checks plus tests. Workers Builds does not run tests, so that fallback could deploy a broken write up. If the loader wrapper fails on Astro 7, the decision returns here.
- **Order uniqueness includes drafts**, so publishing a draft can never collide with a published entry. Runner up: published only, which allows silent collisions on publish.
- **Folder name as id, with a kebab case check.** The id cannot drift from the folder. Runner up: an explicit slug field, which the board declined.
- **A draft example entry as the template**, so the schema and loader run on real content from the first build, and feature 6 has something to copy. Runner up: a template outside the collection, which proves nothing at build time.
- **Fixed English month names in `formatTimeframe`**, so output does not depend on the build machine's locale. Runner up: `Intl.DateTimeFormat`, which varies with the runtime's locale data.
- **Text length limits** (80, 160, 120 and so on) keep cards and meta descriptions from overflowing. They are deliberately generous, and changing one is a one line schema edit.

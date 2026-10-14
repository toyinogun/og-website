# 0005. Work listing: rationale

## Context

The work listing is scope feature 8, the page both readers go to first to judge you. It must make each project easy to scan and easy to open, show a deliberate order, handle the empty case, work on a phone, and carry its own title, description and share card. The scope also asks it to design the tag chip on the `design.md` tokens.

Most parts already exist: spec 0004 built `PageIntro`, `ProjectCard` and `CallToAction`, and spec 0002 owns how pages read projects. Three facts shape this page:

- The home cards must stay tag free (spec 0004 AC-6), while the listing shows stack chips, so the card needs to differ by page without becoming two components.
- Stack lists vary from 2 to 9 entries today, so showing them all makes cards uneven and slow to scan.
- This is the first page that is not `/`. Cloudflare's default (`auto-trailing-slash`) serves `dist/projects/index.html` at `/projects/` and redirects `/projects` there, while spec 0003 fixed nav addresses without a trailing slash. Left alone, every Work click would cost a redirect and the canonical address would disagree with the link.

Already decided by you before this spec: the address `/projects` with the nav label `Work` (current on `/projects/<slug>` too); every published project through `sortProjects(visibleProjects(…))`, featured or not; stack chips only, on the listing only. Decided in this run's question round (2026-10-14): Draft A words with the heading "Work"; one closing call to action section; the empty state as one line plus that closing section; hairline outline chips; chips are plain labels; the first 5 chips in written order; an optional `showStack` prop; three columns.

## Options considered

### Option 1: New route plus `WorkList`, an opt in `showStack` prop, words in `WORK`

A page at `src/pages/projects/index.astro` built from the spec 0004 parts, a small `WorkList` component holding the grid and the empty state, and `ProjectCard` rendering chips only when asked.

**Pros**:
- One card component; the home page needs no change.
- The empty state is testable with the container API, the same way `SelectedWork` is.

**Cons**:
- `ProjectCard` grows a prop and a branch.

### Option 2: A slot on `ProjectCard` for extra content

The listing passes a chip list into a slot.

**Pros**:
- The card stays unaware of chips; any page can add anything.

**Cons**:
- Each page wires its own chips, and the card's internal order is no longer fixed in one place.

### Option 3: A separate `WorkCard`

**Pros**:
- Free to diverge from the home card later.

**Cons**:
- Duplicates the card, its tests and its design values; drift is likely.

### Trailing slash (a sub decision settled here)

- **Drop the slash** (`trailingSlash: 'never'`, `html_handling: "drop-trailing-slash"`): chosen. Matches the nav pattern, no redirect on nav clicks, canonical equals the link. Con: a deploy config change, checked only on the deployed site.
- **Keep Cloudflare's default and link to `/projects/`**: no config change, but it breaks the spec 0003 nav href pattern and its test, and two address styles would coexist.
- **`build.format: 'file'`** (emit `dist/projects.html`): Cloudflare then serves `/projects` by default, but the spec 0003 nav build test (`/x` is `dist/x/index.html`) and every later path would change shape.

## Rationale

Option 1 keeps the one card the home page already tests and adds the smallest switch that satisfies "chips on the listing only". A boolean is enough because the chip content is fixed (the first five stack labels); a slot buys flexibility nothing needs yet. Putting the five limit in `cardStackLabels` keeps the rule in `src/lib/` with the other project helpers, so no component slices data itself.

The chip look follows the quiet editorial rules: hairlines only, no accent (the accent is reserved for links, focus and the one primary button), and muted text that already passes the contrast floor. Making chips non interactive avoids focus stops and JavaScript for a four project list.

`WorkList` exists for the same reason `SelectedWork` does: the real page reads the collection, which the container tests cannot render, so the empty state needs a component to be checked at all. A single closing section serves both the full and the empty page, so the empty line never needs to name the contact channel.

Dropping the trailing slash is decided now because this is the first page where it matters, and feature 9 adds many more under `/projects/`.

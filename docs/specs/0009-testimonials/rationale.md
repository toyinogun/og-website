# 0009. Testimonials: rationale

The decision record behind [index.md](index.md). `/develop` builds from `index.md` and can skip this file.

## Context

Everything on the site today is in your own words. A quote from someone who worked with you persuades a hiring reader and a prospective client in a way your words cannot, which is why feature 14 exists. The build is the easy half: the quotes depend on other people replying, and on 2026-10-14 you have none yet. The site has to ship the feature without looking unfinished, and then show the first quote the day it arrives.

Three forces make the shape of a quote hard to change later. First, spec 0002 made a project's id (its folder name) the stable key a quote can point at, so a quote can sit beside the work it is about; once quote files point at ids, the pointer's form is fixed. Second, this repository is public: whatever a quote file holds is published forever in git history, so the record that the person said yes has to live here without any of their contact details. Third, Workers Builds gates each production deploy only on `astro check && astro build`; a rule that only a Vitest test enforces can reach production if the pull request checks are skipped, while a rule the build enforces cannot.

The readers are both hiring managers and clients, and so are the quote givers: past colleagues and managers (about how you work, rarely tied to one write up) and clients (about delivered work, often tied to one). All four write ups today are personal projects, so a quote tied to a project is rare for now. The design system (spec 0003, `design.md`) is a quiet editorial look: type leads, white space arranges, no shadows, one accent used sparingly, and no client JavaScript beyond the two theme scripts.

Answered by you on 2026-10-14: none yet; quotes from both colleagues and clients; shown on the home page plus the page of the project a quote points at; on the home page right after Selected work; a content collection, one file per quote; full name, role and company all required; an optional public profile link; no photos; a required permission record of the date and the channel, nothing else; large quotes stacked in the reading column; up to three on the home page in an order you set; and nothing rendered when there are none.

## Options considered

### Option 1: A `testimonials` content collection, one YAML file per quote, checked at build time

Each quote is `src/content/testimonials/<id>.yaml`, validated by a strict Zod schema, with a loader check (like the projects loader) that fails the build on an unknown project id, a duplicate order, a bad file name or contact details in the text.

**Pros**:
- The build enforces every rule, so nothing broken reaches production even if the pull request checks are bypassed.
- Same pattern as projects (spec 0002), so it reads like the rest of the code.
- Adding a quote is adding a file; no code changes.

**Cons**:
- More moving parts than a constant: a schema, a check module, a loader.
- Astro warns on every build while the collection is empty.
- Astro's own `reference()` only warns on a missing id, so the project check has to be written by hand.

### Option 2: One `TESTIMONIALS` constant in `src/lib/testimonials.ts` with a test

All quotes in one typed array, held to their limits by a Vitest test, like the page word constants.

**Pros**:
- Fewest moving parts; the type checker catches missing fields during `astro check`.
- Matches the page word pattern from spec 0004 and spec 0005.

**Cons**:
- A wrong project id, a length breach or contact details are caught only by tests, which Workers Builds does not run.
- Quotes are other people's content, not page words; mixing them blurs the rule that a page's constant holds only its own words.

### Option 3: A `testimonials` list inside each project's frontmatter

Each write up carries the quotes about it.

**Pros**:
- No id to point at; a quote can never point at a missing project.

**Cons**:
- A colleague's quote about how you work, which is not about any one project, has nowhere to live, and those are most of the quotes you expect.
- The home page would have to gather quotes out of every write up and order them across files.

## Rationale

Option 1 is the only one where the build itself refuses a quote without a recorded yes, with a wrong project id or with a phone number pasted into it. That matters because the repository is public and git history keeps everything: the moment to stop a mistake is before it merges, and Workers Builds only runs the build. It also keeps quotes as content, separate from the page words, and reuses the spec 0002 machinery (`Problem`, `checkSlug`, `findDuplicateOrders`, the one throw at the loader edge), so the extra parts are familiar rather than new. Option 2 is the honest runner up: it is simpler, and with one or two quotes it would work; it loses on enforcement, not on effort.

YAML over Markdown per file: a quote is a short plain string with a few fields, and a Markdown body would invite formatting the design does not want. The project id check reads the project folder names from disk at the loader edge rather than the `projects` store, because collections may load in either order and the folder name is the id by definition (spec 0002, `checkSlug`). There is no `draft` field: a draft quote would be one without a yes, which is exactly what the build should refuse; the runner up was a draft flag that waived the permission rule on the dev server, rejected as one more way for a quote to slip through.

The permission record holds the date and the channel only. That is enough to point back to the person's reply in your inbox if anyone asks, and holds nothing that identifies how to reach them. A plain `approved: true` flag would record nothing you could point back to.

On display, a stacked column of large quotes reads as a deliberate pull quote at one, a pair at two, and keeps its shape at three, with no JavaScript; a card grid looks empty at one, and a carousel needs JavaScript, hides all but one quote, and is hard to make accessible. The one quote case steps up to `--text-2xl` so a single quote fills its section with intent rather than looking like the first of a list that never came. The quotes keep the Prose quote treatment (a 2px `line` left border, no added quotation marks) so the site has one quote style. With no quotes, the section does not render, the same rule `SelectedWork` follows for no featured projects.

Smaller calls made here: three on the home page (`HOME_TESTIMONIAL_LIMIT`) because more than three large quotes push About far down the page, while a project page shows all of its own because there will rarely be more than one or two; the home page's project line links only to a project page that exists in the build, so a quote about a draft never links to a missing page; no `Review` structured data, because search engines ignore reviews a site publishes about itself and the markup would add risk for no gain; quotes are limited to 20 to 320 characters so the large type stays readable; and the contact details check is a pattern match for email addresses and phone numbers, cheap and good at the usual slip, not a guarantee.

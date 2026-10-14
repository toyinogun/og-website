# 0004. Home page: rationale

The decision record behind [index.md](index.md). `/develop` builds from `index.md` and can skip this file.

## Context

The home page is the page that decides whether a visitor keeps reading. Two readers land on it: someone deciding whether to hire you and someone deciding whether to contract you. Both need the same three things within seconds: what you do, proof that you do it well, and an obvious way to start a conversation (scope feature 7). Everything else on the site exists, or will exist, to support those three.

The forces are mostly sequencing. The page ships before the work listing (feature 8), the project pages (feature 9), the about page (feature 10), the contact form (feature 11) and the search and share work (feature 12). So it has to show proof without linking to project pages that do not exist yet, offer a call to action before the form exists, and carry a title, description and share preview without taking feature 12's decisions away from it. Spec 0003 also promises that the live site never links to a missing page, and the nav build test enforces it.

The building blocks are fixed: the quiet editorial look in `design.md` (type leads, white space arranges, one accent used sparingly), the spec 0003 components (`Container`, `Section`, `Stack`, `Grid`, `Button`, `Prose`), the spec 0002 helpers for picking and ordering projects, and the bio in `src/content/bio.md` from feature 6. The site is fully static on Cloudflare (spec 0001), with a near zero cost constraint and a WCAG 2.2 AA target.

The page also sets the patterns the four pages after it reuse. If it hard codes its layout, each later page invents its own intro, card and call to action, and the site drifts. If it over abstracts, it builds machinery no page needs. The constraint is a two week window for the whole first release.

## Options considered

### Option 1: One self contained page file

Write everything in `src/pages/index.astro`: the words inline, the card markup in a loop, the button inline, the share tags in the page head through a slot.

**Pros**:
- Fewest files; the fastest possible first version.
- Nothing to learn beyond the page itself.

**Cons**:
- Features 8 to 11 copy the intro, card and button markup, so the card and the call to action drift apart across pages.
- The call to action target is written in two places on this page and again on every later page; moving it to the contact form means a hunt.
- The empty featured state cannot be tested with the container API without a real empty collection.

### Option 2: Spec 0003 parts plus three shared components, words in one typed constant (chosen)

Build `PageIntro`, `CallToAction` and `ProjectCard` as shared components, a small home only `SelectedWork` wrapper, a `HOME` copy constant with length limits, `SITE.contact` as the one call to action target, and the basic share tags inside `BaseLayout`.

**Pros**:
- The three pieces every later page needs exist, tested, before those pages start.
- One place for the words and one place for the call to action target.
- Share previews work on every page at no cost, from values each page already passes.
- The empty state and the card variants are testable in isolation.

**Cons**:
- Five new files and a few more tests than Option 1.
- The project card is designed before the listing page that uses it most, so feature 8 may want to adjust it.

### Option 3: Content driven home page

Put the home words in a Markdown or data file under `src/content/` with its own collection and schema, so the copy reads like the bio and the write ups.

**Pros**:
- Copy sits beside the other content; editing feels the same as editing a write up.
- A schema can validate lengths at build time.

**Cons**:
- A collection and schema for one set of nine strings is machinery with little payoff.
- Spreads one page's contract across a schema, a content file and the page.
- A schema error is harder to read than a failing unit test on a typed constant.

## Rationale

Option 2 fits the sequencing problem. The home page is the first of five pages, and the three things it needs (an intro, a card, a call to action) are exactly what the next four need. Building them once, now, while the home page gives them a real first use, is cheaper than extracting them later from copies. Option 1 is faster by perhaps an hour but pays that back the first time feature 8 copies the card. Option 3 solves an editing comfort problem that does not exist yet: nine short strings in a typed constant are as easy to edit as a Markdown file, and the length test catches the mistakes a schema would.

The call to action goes to your LinkedIn profile because that is the address you gave and chose, and it keeps your email away from scrapers. Routing it through one constant, `SITE.contact`, means the contact form later swaps the target in one place. The cards link to each project's own code or live link until project pages exist, which keeps the promise that the site never links to a missing page while still letting a reader check the work. Equal cards in a three column grid keep the order you set (spec 0002) as the only signal of strength, and the measured layout puts the top of the first card inside a laptop's first screen.

For metadata, writing the basic share tags from the title and description each page already passes is the smallest step that gives every page a decent pasted preview, and it adds no new props, so feature 12 keeps every real decision: the image, how it is made, the sitemap and the structured data. The alternatives were a fixed share image now (which feature 12 would likely throw away) or nothing (a bare preview for the links you are about to send out in applications).

**Decisions made in writing this spec** (recommended picks, the runner up in brackets):
- The availability line, the lead and the button sit in a `PageIntro` with a `display` and a `page` size, so inner pages use the same piece with the inner page heading size [a home only hero component].
- The hero has no bottom padding and the next `Section` supplies the rhythm, because that is what puts the first card inside the first laptop screen [a shorter section rhythm, which would change spec 0003's tokens].
- The card link uses the kind's label with a visually hidden "for <title>" suffix, so three "Code" links stay distinguishable to screen reader users [visible "Code for <title>", which is long on a small card].
- The card shows the first link in the write up's `links` list, so the write up's order decides [a fixed preference for live over code links].
- The About paragraph is plain text from `firstParagraph`, guarded by a test, because the current first paragraph has no formatting [rendering the Markdown, which needs a Markdown pipeline for one paragraph].
- `SelectedWork` is its own component so the empty case can be tested [an inline conditional in the page, testable only end to end].
- The Home nav link is your answer in round one, following spec 0003's plan that each page feature adds its own link. It costs a second header row on phones and repeats the wordmark [keeping the nav empty until feature 8 adds Work].
- Cover images use Astro's default lazy loading; the heading text, not an image, is the first thing to paint [eager loading for the first card].
